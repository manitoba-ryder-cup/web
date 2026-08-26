<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { MatchSide, ScoreEntry } from '@/api/types'
import { isRefusal, isStatus } from '@/lib/apiError'
import { displayError } from '@/lib/displayError'
import { useMatchContext } from '@/composables/useMatchContext'
import { useAfterHoleSaved } from '@/composables/useAfterWrite'
import { buildHoleEntries, type HoleEntry } from '@/lib/holeEntry'
import { recordsScorePerPlayer } from '@/lib/matchFormat'
import { matchCompleteMessage } from '@/lib/matchResult'
import { hasStarted, holeOpen } from '@/lib/scoringWindow'
import { formatTeeTime, teeDayLabel } from '@/lib/teeTime'
import { toast } from '@/composables/useToast'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import HoleBar from '@/components/tournament/HoleBar.vue'
import StrokePicker from '@/components/tournament/StrokePicker.vue'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_SCORES_WRITE } from '@/api/scopes'

const props = defineProps<{ tournamentId: string; matchId: string; hole: string }>()
const router = useRouter()
const holeNumber = computed(() => Number(props.hole))

const afterHoleSaved = useAfterHoleSaved()
// Loads once — stepping between holes only re-derives from what is already here.
const { error, loading, retry, teams, results, holeStates, holes, match, left, right } = useMatchContext(
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
function canScore(hole: number): boolean {
  return auth.hasScope(SCOPE_SCORES_WRITE) && holeOpen(match.value, hole, { finished: finished.value, scoredHoles: scoredHoles.value })
}
// A hole that cannot be recorded goes back to the card, which carries everything this showed
// a reader. `readonly` still covers the frame between the data landing and the redirect.
const editable = computed(() => canScore(holeNumber.value))
const saving = ref(false)
// A step onto a hole the page would turn straight back is a dead chevron instead, so the
// pager never answers a tap by throwing you off the page.
function step(by: number): number | null {
  // Held while a save is in flight: the write is for the hole the button was pressed on.
  if (saving.value) return null
  const n = holeNumber.value + by
  return n >= 1 && n <= 18 && canScore(n) ? n : null
}
const prevHole = computed(() => step(-1))
const nextHole = computed(() => step(1))
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

const perPlayer = computed(() => recordsScorePerPlayer(match.value?.format_name))

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
// A scored hole opens on its scores. An unplayed one opens on nothing chosen, so a hole
// only looked at cannot be saved as four pars by a reflex tap.
watch([() => props.hole, left, right, holeInfo], rebuild, { immediate: true })

// All of them or none, because the hole is written whole: a strip nobody has touched has to
// stop the write rather than drop out of it and leave a half-scored hole behind.
const scores = computed<ScoreEntry[] | null>(() => {
  const out: ScoreEntry[] = []
  for (const e of entries.value) {
    if (e.strokes === null) return null
    out.push({ team_id: e.teamId, player_id: e.playerId, strokes: e.strokes })
  }
  return out
})
// A save in flight keeps its button: the write that closes a match out is what makes the hole
// read-only, and the control must not vanish under the thumb still pressing it.
const showSave = computed(() => !readonly.value || saving.value)

// Awaited, so the button stays disabled until the route has changed: re-enabling mid-
// transition leaves a second tap free to write the same hole again.
function goToScorecard(hole?: number) {
  return router.push({
    name: 'match',
    params: { tournamentId: props.tournamentId, matchId: props.matchId },
    ...(hole ? { hash: `#hole-${hole}` } : {}),
  })
}
function goToHole(hole: number) {
  // Replace, so backing out of a correction reaches the card rather than walking the holes
  // stepped through to make it.
  return router.replace({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole } })
}
// Back to the card, not on to the next hole: the next score is a fairway away, and this page
// hides the tab bar, so the card is the only way to the other matches a scorer is watching.
async function saveHole() {
  const payload = scores.value
  if (!payload) return
  // Read before the await, so the write, the refusal and the hash all name the same hole
  // however the route moves under them.
  const hole = holeNumber.value
  saving.value = true
  saveError.value = ''
  try {
    // One write for the hole: it lands whole or not at all, so a dropped connection can
    // never leave one side scored and the other not.
    const status = await scorecardApi.submitHoleScores(props.matchId, { hole_number: hole, scores: payload })
    if (status.finished) {
      finishedByWrite.value = true
      toast.success(matchCompleteMessage(status, match.value?.sides ?? []))
    }
    await afterHoleSaved(props.tournamentId, props.matchId)
    await goToScorecard(hole)
  } catch (err) {
    // The server answers 409 for a shut window and for a hole a decided match never reached, and
    // this cannot tell them apart — so the sentence has to hold for both.
    if (isStatus(err, 409)) {
      finishedByWrite.value = true
      refusedHole.value = hole
      saveError.value = 'This hole is closed to scoring — the match finished before it, or its window has shut.'
    } else {
      saveError.value = isRefusal(err) ? `Save failed — ${displayError(err)}` : 'Save failed. Please try again.'
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
          <div class="-mx-4 -mt-4 border-b border-mrc-line-strong bg-mrc-surface px-2 shadow">
            <SkeletonBlock radius="none" class="h-20 w-full" />
            <SkeletonBlock radius="md" class="mx-auto my-3 h-8 w-64" />
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
        <div class="sticky top-0 z-10 -mx-4 -mt-4 border-b border-mrc-line-strong bg-mrc-surface px-2 shadow">
          <!-- Overall event standing stays in view while you enter this hole's scores. -->
          <ScoreBar flat class="-mx-2" :results="results" :teams="teams" />
          <HoleBar class="-mx-2" :hole="holeNumber" :info="holeInfo" :prev="prevHole" :next="nextHole" @go="goToHole" />
        </div>

        <div class="mt-1 -mx-4 divide-y divide-mrc-line border-b border-mrc-line">
          <StrokePicker
            v-for="e in entries"
            :key="e.key"
            v-model="e.strokes"
            :par="holeInfo.par"
            :name="e.name"
            :readonly="readonly"
            :prior-strokes="e.priorStrokes"
            :prior-par="e.priorPar"
          />
        </div>

        <p v-if="saveError" class="mt-6 text-center text-sm text-mrc-red-team">{{ saveError }}</p>
        <button
          v-if="showSave"
          type="button"
          class="mt-6 w-full rounded-md bg-mrc-accent py-4 font-semibold text-white transition hover:bg-mrc-accent-dark disabled:opacity-60"
          :disabled="saving || !scores"
          @click="saveHole"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </template>
      <p v-else class="mt-4 text-mrc-muted">Hole not found.</p>
    </AsyncState>
  </PageLayout>
</template>
