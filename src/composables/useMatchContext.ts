import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'

interface Options {
  // The hole-entry flow loads once instead: a refetch mid-entry would fight the strips. Omitting
  // this turns off the focus refetch too, which is the same refetch by another name.
  intervalMs?: MaybeRefOrGetter<number | false>
  // Treat a missing tee set as empty rather than an error. The scorecard renders without
  // par; the entry page cannot, so it lets the failure surface.
  parOptional?: boolean
}

// Both match views need exactly this, and the same requests in flight at once.
export function useMatchContext(
  tournamentId: MaybeRefOrGetter<string>,
  matchId: MaybeRefOrGetter<string>,
  { intervalMs, parOptional = false }: Options = {},
) {
  const tid = () => toValue(tournamentId)
  const mid = () => toValue(matchId)
  const { data, error, loading, refresh, retry } = useAsync(
    // A getter, not a literal: vue-router reuses this across a change of :matchId, and a key
    // captured once leaves the previous match's card under the new URL.
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
    // Given, not truthy: `false` and `() => false` say the same thing and split otherwise.
    intervalMs !== undefined ? { intervalMs } : { refetchOnFocus: false },
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
