<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError, type MatchSide } from '@/api/types'
import { useMatchContext } from '@/composables/useMatchContext'
import { buildHoleEntries, type HoleEntry } from '@/lib/holeEntry'
import { matchCompleteMessage } from '@/lib/matchResult'
import { hasStarted, holeOpen } from '@/lib/scoringWindow'
import { formatTeeTime, teeDayLabel } from '@/lib/teeTime'
import { toast } from '@/composables/useToast'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import StrokePicker from '@/components/tournament/StrokePicker.vue'
import FlagIcon from '@/components/icons/FlagIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_SCORES_WRITE } from '@/api/scopes'

const props = defineProps<{ tournamentId: string; matchId: string; hole: string }>()
const router = useRouter()
const holeNumber = computed(() => Number(props.hole))

// Loads once — walking to the next hole only re-derives from what is already here.
const { error, loading, retry, refresh, teams, results, holeStates, holes, match, left, right } = useMatchContext(
  () => props.tournamentId,
  () => props.matchId,
)
// The server refuses a write before a match tees off, so the strips are not offered either.
const auth = useAuthStore()
const started = computed(() => hasStarted(match.value))
const holeInfo = computed(() => holes.value.find((h) => h.number === holeNumber.value) ?? null)
// The loaded result is a snapshot from mount, so a save that ends the match sets this too
// — otherwise walking forward would still offer a strip on a hole the match never reached.
const finishedByWrite = ref(false)
const finished = computed(() => finishedByWrite.value || (match.value?.finished ?? false))
const scoredHoles = computed(() => holeStates.value.map((h) => h.hole_number))
// A hole that cannot be recorded goes back to the card, which carries everything this showed
// a reader. `readonly` still covers the frame between the data landing and the redirect.
const editable = computed(
  () =>
    auth.hasScope(SCOPE_SCORES_WRITE) &&
    holeOpen(match.value, holeNumber.value, { finished: finished.value, scoredHoles: scoredHoles.value }),
)
const saveError = ref('')
// A message that outlived its hole would keep the redirect off for every hole after it.
const refusedHole = ref<number | null>(null)
const readonly = computed(() => !editable.value)
// A hole outside the card's eighteen has nothing behind it either, and dead-ended on
// "Hole not found." rather than going anywhere useful.
const onTheCard = computed(() => Number.isInteger(holeNumber.value) && holeNumber.value >= 1 && holeNumber.value <= 18)
// Where this hole sends a reader, or null to stay. A computed rather than a watch over a
// list of sources: the list has to be kept in step with what the guards read, and was not.
const sendAway = computed(() => {
  if (loading.value || !match.value) return null
  // A match that has not gone off is a different answer from one that will not take this
  // hole, and the page below says when it tees off. Leave that reachable.
  if (!started.value) return null
  if (editable.value && onTheCard.value) return null
  // Not over a refusal still unread — but only the one about this hole, or a single 409 would
  // switch the redirect off for the rest of the walk.
  if (saveError.value && refusedHole.value === holeNumber.value) return null
  return { name: 'match', params: { tournamentId: props.tournamentId, matchId: props.matchId } }
})
// A warm cache resolves before the first render, so without immediate the arrival this
// guards — a shared link, a typed URL — is exactly the one that never triggers it.
watch(sendAway, (to) => to && router.replace(to), { immediate: true })

// Singles/Fourball record a score per player; one-ball formats (Alt Shot/Scramble/Scotch)
// record one score per team (player_id null).
const perPlayer = computed(() => ['Singles', 'Fourball'].includes(match.value?.format_name ?? ''))

const entries = ref<HoleEntry[]>([])

function rebuild() {
  const sides = [left.value, right.value].filter((s): s is MatchSide => s != null)
  entries.value = buildHoleEntries(sides, {
    perPlayer: perPlayer.value,
    holeNumber: holeNumber.value,
    holes: holes.value,
    holeStates: holeStates.value,
  })
}
// A scored hole opens on its scores, an unplayed one on par.
watch([() => props.hole, left, right, holeInfo], rebuild, { immediate: true })

const saving = ref(false)
const buttonLabel = computed(() => {
  const last = holeNumber.value >= 18
  if (readonly.value) return last ? 'Back to Scorecard' : 'Next Hole'
  return last ? 'Save & Finish' : 'Save & Next Hole'
})

// Awaited, so the button stays disabled until the route has changed: re-enabling mid-
// transition let a second tap land hole 16 in behind the scorecard.
function goToScorecard() {
  return router.push({ name: 'match', params: { tournamentId: props.tournamentId, matchId: props.matchId } })
}
function goNext() {
  const n = holeNumber.value
  if (n >= 18) return goToScorecard()
  return router.push({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole: n + 1 } })
}
async function saveAndNext() {
  if (readonly.value) return goNext()
  saving.value = true
  saveError.value = ''
  try {
    // One write for the hole: it lands whole or not at all, so a dropped connection can
    // never leave one side scored and the other not.
    const status = await scorecardApi.submitHoleScores(props.matchId, {
      hole_number: holeNumber.value,
      scores: entries.value.map((e) => ({ team_id: e.teamId, player_id: e.playerId, strokes: e.strokes })),
    })
    // No next hole to walk to. Each hole taps back from the scorecard, so a wrong score is still
    // a tap from being fixed and the toast only explains why Save did not move on.
    if (status.finished) {
      finishedByWrite.value = true
      toast.success(matchCompleteMessage(status, match.value?.sides ?? []))
      await goToScorecard()
      return
    }
    // The page loads once, so without this the next hole's running totals omit what was just
    // written, and coming back here shows par — saving from there would overwrite it.
    await refresh()
    await goNext()
  } catch (err) {
    // The server answers 409 for a shut window and for a hole a decided match never reached, and
    // this cannot tell them apart — so the sentence has to hold for both.
    if (err instanceof ApiError && err.status === 409) {
      finishedByWrite.value = true
      refusedHole.value = holeNumber.value
      saveError.value = 'This hole is closed to scoring — the match finished before it, or its window has shut.'
    } else {
      saveError.value = err instanceof ApiError ? `Save failed — ${err.message}` : 'Save failed. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <PageLayout>
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- No hero here, so loading is otherwise a blank screen on the page most likely to be opened
             on a weak connection. Two strips, not four: under-promising closes up rather than gaps. -->
        <div data-testid="skeleton">
          <div class="-mx-4 -mt-4 border-b border-mrc-line-strong bg-mrc-surface px-2 pb-3 shadow">
            <SkeletonBlock radius="none" class="h-20 w-full" />
            <SkeletonBlock radius="md" class="mx-auto mt-3 h-6 w-64" />
            <SkeletonBlock class="mx-auto mt-3 h-4 w-72" />
          </div>
          <div class="-mx-4 mt-6 divide-y divide-mrc-line border-b border-mrc-line">
            <div v-for="n in 2" :key="n" class="flex items-center justify-between px-4 py-6">
              <SkeletonBlock class="h-5 w-32" />
              <SkeletonBlock radius="md" class="h-12 w-40" />
            </div>
          </div>
          <SkeletonBlock radius="md" class="mt-6 h-14 w-full" />
        </div>
      </template>
      <!-- Before the cup, say so rather than offering a strip the server would refuse.
           The match's own page still shows its tee time, format and lineup. -->
      <div v-if="match && !started" class="mx-auto mt-6 max-w-2xl text-center">
        <p class="text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <p class="mt-6 text-mrc-muted">
          This match hasn't started yet — it tees off {{ teeDayLabel(match.tee_time) }} at {{ formatTeeTime(match.tee_time) }}.
        </p>
        <RouterLink
          :to="{ name: 'match', params: { tournamentId, matchId } }"
          class="mt-6 inline-flex items-center justify-center rounded bg-mrc-accent px-6 py-2 font-semibold text-white shadow-md transition hover:bg-mrc-accent-dark"
        >
          Back to Scorecard
        </RouterLink>
      </div>
      <template v-else-if="match && holeInfo">
        <!-- Sticky context: the match summary, with the hole details on one line below it. -->
        <div class="sticky top-0 z-10 -mx-4 -mt-4 border-b border-mrc-line-strong bg-mrc-surface px-2 pb-3 shadow">
          <!-- Overall event standing stays in view while you enter this hole's scores. -->
          <ScoreBar flat class="-mx-2" :results="results" :teams="teams" />
          <MatchSummary class="mt-3" :match="match" :teams="teams" />
          <div class="mt-3 flex items-center justify-center gap-10 text-mrc-muted">
            <span class="flex items-center gap-2 text-xl font-semibold"> <FlagIcon />{{ hole }} </span>
            <span>Par {{ holeInfo.par }}</span>
            <span>{{ holeInfo.yards }} Yards</span>
            <span>HDCP {{ holeInfo.hdcp }}</span>
          </div>
        </div>

        <div class="mt-6 -mx-4 divide-y divide-mrc-line border-b border-mrc-line">
          <!-- Only blank once the match is over: while it's live, par is what Save records. -->
          <StrokePicker
            v-for="e in entries"
            :key="e.key"
            v-model="e.strokes"
            :par="holeInfo.par"
            :name="e.name"
            :readonly="readonly"
            :unscored="readonly && !e.scored"
            :prior-strokes="e.priorStrokes"
            :prior-par="e.priorPar"
          />
        </div>

        <p v-if="saveError" class="mt-6 text-center text-sm text-mrc-red-team">{{ saveError }}</p>
        <button
          type="button"
          class="mt-6 w-full rounded-md bg-mrc-accent py-4 font-semibold text-white transition hover:bg-mrc-accent-dark disabled:opacity-60"
          :disabled="saving"
          @click="saveAndNext"
        >
          {{ saving ? 'Saving…' : buttonLabel }}
        </button>
      </template>
      <p v-else class="mt-4 text-mrc-muted">Hole not found.</p>
    </AsyncState>
  </PageLayout>
</template>
