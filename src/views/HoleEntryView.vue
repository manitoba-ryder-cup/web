<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError, type MatchSide } from '@/api/types'
import { useMatchContext } from '@/composables/useMatchContext'
import { buildHoleEntries, type HoleEntry } from '@/lib/holeEntry'
import { matchCompleteMessage } from '@/lib/matchResult'
import { scoringOpen } from '@/lib/scoringWindow'
import { toast } from '@/composables/useToast'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import ScoreWheel from '@/components/tournament/ScoreWheel.vue'
import FlagIcon from '@/components/icons/FlagIcon.vue'

const props = defineProps<{ tournamentId: string; matchId: string; hole: string }>()
const router = useRouter()
const holeNumber = computed(() => Number(props.hole))

// Loads once — walking to the next hole only re-derives from what is already here.
const { error, loading, retry, refresh, tournament, teams, results, holeStates, holes, match, left, right } = useMatchContext(
  props.tournamentId,
  props.matchId,
)
// Scores belong to the days the cup is played. Before then a match is only ever being
// poked at, so the wheels aren't offered at all — the server refuses the write too.
const started = computed(() => scoringOpen(tournament.value))
const holeInfo = computed(() => holes.value.find((h) => h.number === holeNumber.value) ?? null)
// A finished match is read-only (the write flow only makes sense for a live round). The
// loaded result is a snapshot from mount, so a save that ends the match sets this too —
// otherwise walking to the next hole would still offer an editable wheel.
const finishedByWrite = ref(false)
const readonly = computed(() => finishedByWrite.value || (match.value?.finished ?? false))

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
const saveError = ref('')
const buttonLabel = computed(() => {
  const last = holeNumber.value >= 18
  if (readonly.value) return last ? 'Back to Scorecard' : 'Next Hole'
  return last ? 'Save & Finish' : 'Save & Next Hole'
})

// Both return the pending navigation: saveAndNext awaits it so the button stays disabled
// until the route has actually changed. Re-enabling mid-transition let a second tap fire
// goNext() on a match the save had just finished, landing hole 16 in behind the scorecard.
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
    // This hole closed the match out, so there is no next hole to walk to. The scorecard
    // shows the result and each hole taps back here, so a wrong score is a tap from being
    // fixed — the toast only explains why Save didn't land on the next hole.
    if (status.finished) {
      finishedByWrite.value = true
      toast.success(matchCompleteMessage(status, match.value?.sides ?? []))
      await goToScorecard()
      return
    }
    // The page loads once, so without this the scores just written stay invisible to it:
    // the next hole's running totals would omit them, and coming back to this hole would
    // show par again — and saving from there would overwrite what was just recorded.
    await refresh()
    await goNext()
  } catch (err) {
    // 409 means the match was already over — a tab that went stale before this hole.
    if (err instanceof ApiError && err.status === 409) {
      finishedByWrite.value = true
      saveError.value = 'This match is already complete — its scores can no longer be changed.'
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
      <!-- Before the cup, say so rather than offering wheels the server would refuse.
           The match's own page still shows its tee time, format and lineup. -->
      <div v-if="match && !started" class="mx-auto mt-6 max-w-2xl text-center">
        <p class="text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <p class="mt-6 text-mrc-muted">This match hasn't started yet — scores can be entered on the day it's played.</p>
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
          <ScoreWheel
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
