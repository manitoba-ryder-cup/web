import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'

interface Options {
  // Poll, for a view watching a round happen. The hole-entry flow loads once instead:
  // it writes the scores itself, and a refetch mid-entry would fight the strips — which
  // is why the absence of this also turns off the refetch on tab focus. Left on, coming
  // back to the app with strokes dialled in can decide the match is over and send the
  // scorer to the card without a word.
  intervalMs?: number
  // Treat a missing tee set as empty rather than an error. The scorecard renders without
  // par; the entry page cannot, so it lets the failure surface.
  parOptional?: boolean
}

// Everything a single match needs: the tournament's teams and results, the match's played
// holes and tee set, and the match resolved out of the results with its two sides ordered.
// Both match views need exactly this, and the same requests in flight at once.
export function useMatchContext(
  tournamentId: MaybeRefOrGetter<string>,
  matchId: MaybeRefOrGetter<string>,
  { intervalMs, parOptional = false }: Options = {},
) {
  const tid = () => toValue(tournamentId)
  const mid = () => toValue(matchId)
  const { data, error, loading, refresh, retry } = useAsync(
    // A getter, not a literal: vue-router reuses this component across a change of :matchId,
    // and a key captured once would leave the previous match's card under the new URL.
    // parOptional is in it because it changes what a failed tee-set fetch returns, so two
    // callers asking about the same match on different terms must not share one answer.
    () => ['match', tid(), mid(), parOptional],
    async () => {
      const holes = scorecardApi.getMatchHoles(mid())
      const [teams, results, holeStates, tee] = await Promise.all([
        scorecardApi.getTournamentTeams(tid()),
        scorecardApi.getTournamentResults(tid()),
        scorecardApi.getMatchScores(mid()),
        parOptional ? holes.catch(() => []) : holes,
      ])
      return { teams, results, holeStates, holes: tee }
    },
    intervalMs ? { intervalMs } : { refetchOnFocus: false },
  )

  const teams = computed(() => data.value?.teams ?? [])
  const results = computed(() => data.value?.results ?? [])
  // holeStates is the per-hole match state (who's up); holes is the tee set's par/yardage.
  const holeStates = computed(() => data.value?.holeStates ?? [])
  const holes = computed(() => data.value?.holes ?? [])
  const match = computed(() => results.value.find((m) => m.match_id === mid()) ?? null)

  const { left, right } = useMatchSides(
    () => match.value,
    () => teams.value,
  )

  return { error, loading, refresh, retry, teams, results, holeStates, holes, match, left, right }
}
