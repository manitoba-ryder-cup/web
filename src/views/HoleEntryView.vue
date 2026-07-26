<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError, type MatchSide, type MatchStatus } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'
import { buildHoleEntries, type HoleEntry } from '@/lib/holeEntry'
import { matchCompleteMessage } from '@/lib/matchResult'
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

// Match/teams/holes/scores are per-match, so this loads once; changing hole only re-derives.
const { data, error, loading } = useAsync(async () => {
  const [teams, results, holes, holeStates] = await Promise.all([
    scorecardApi.getTournamentTeams(props.tournamentId),
    scorecardApi.getTournamentResults(props.tournamentId),
    scorecardApi.getMatchHoles(props.matchId),
    scorecardApi.getMatchScores(props.matchId),
  ])
  return { teams, results, holes, holeStates }
})
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])
const match = computed(() => results.value.find((m) => m.match_id === props.matchId) ?? null)
const holeInfo = computed(() => (data.value?.holes ?? []).find((h) => h.number === holeNumber.value) ?? null)
// What was already recorded for this hole, if anything — the wheels open on it.
const scored = computed(() => (data.value?.holeStates ?? []).find((h) => h.hole_number === holeNumber.value) ?? null)

const { left, right } = useMatchSides(
  () => match.value,
  () => teams.value,
)
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
    holes: data.value?.holes ?? [],
    holeStates: data.value?.holeStates ?? [],
  })
}
// A scored hole opens on its scores, an unplayed one on par.
watch([() => props.hole, left, right, holeInfo, scored], rebuild, { immediate: true })

const saving = ref(false)
const saveError = ref('')
const buttonLabel = computed(() => {
  const last = holeNumber.value >= 18
  if (readonly.value) return last ? 'Back to Scorecard' : 'Next Hole'
  return last ? 'Save & Finish' : 'Save & Next Hole'
})

function goToScorecard() {
  router.push({ name: 'match', params: { tournamentId: props.tournamentId, matchId: props.matchId } })
}
function goNext() {
  const n = holeNumber.value
  if (n < 18) router.push({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole: n + 1 } })
  else goToScorecard()
}
async function saveAndNext() {
  if (readonly.value) return goNext()
  saving.value = true
  saveError.value = ''
  try {
    // Sequential so the match result recompute on each write stays ordered. Each write
    // returns the recomputed match, and the last one is the state after the whole hole.
    let status: MatchStatus | null = null
    for (const e of entries.value) {
      status = await scorecardApi.submitScore(props.matchId, {
        hole_number: holeNumber.value,
        strokes: e.strokes,
        team_id: e.teamId,
        player_id: e.playerId,
      })
    }
    // This hole closed the match out, so there is no next hole to walk to. The scorecard
    // shows the result and each hole taps back here, so a wrong score is a tap from being
    // fixed — the toast only explains why Save didn't land on the next hole.
    if (status?.finished) {
      finishedByWrite.value = true
      toast.success(matchCompleteMessage(status, match.value?.sides ?? []))
      goToScorecard()
      return
    }
    goNext()
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
    <AsyncState :loading="loading" :error="error">
      <template v-if="match && holeInfo">
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
