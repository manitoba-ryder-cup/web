import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'

interface Options {
  // Poll, for a view watching a round happen. The hole-entry flow loads once instead:
  // it writes the scores itself, and a refetch mid-entry would fight the wheels.
  intervalMs?: number
  // Treat a missing tee set as empty rather than an error. The scorecard renders without
  // par; the entry page cannot, so it lets the failure surface.
  parOptional?: boolean
}

// Everything a single match needs: the tournament's teams and results, the match's played
// holes and tee set, and the match resolved out of the results with its two sides ordered.
// Both match views need exactly this, and the same four requests in flight at once.
export function useMatchContext(tournamentId: string, matchId: string, { intervalMs, parOptional = false }: Options = {}) {
  const { data, error, loading, refresh } = useAsync(
    async () => {
      const holes = scorecardApi.getMatchHoles(matchId)
      const [teams, results, holeStates, tee] = await Promise.all([
        scorecardApi.getTournamentTeams(tournamentId),
        scorecardApi.getTournamentResults(tournamentId),
        scorecardApi.getMatchScores(matchId),
        parOptional ? holes.catch(() => []) : holes,
      ])
      return { teams, results, holeStates, holes: tee }
    },
    intervalMs ? { intervalMs } : {},
  )

  const teams = computed(() => data.value?.teams ?? [])
  const results = computed(() => data.value?.results ?? [])
  // holeStates is the per-hole match state (who's up); holes is the tee set's par/yardage.
  const holeStates = computed(() => data.value?.holeStates ?? [])
  const holes = computed(() => data.value?.holes ?? [])
  const match = computed(() => results.value.find((m) => m.match_id === matchId) ?? null)

  const { left, right } = useMatchSides(
    () => match.value,
    () => teams.value,
  )

  return { error, loading, refresh, teams, results, holeStates, holes, match, left, right }
}
