import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { q } from '@/api/queries'
import { combine, useResource } from '@/composables/useAsync'
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
  // Given, not truthy: `false` and `() => false` say the same thing and split otherwise.
  const opts = intervalMs !== undefined ? { intervalMs } : { refetchOnFocus: false }

  const teamsRes = useResource(() => q.teams(tid()), opts)
  const resultsRes = useResource(() => q.results(tid()), opts)
  const scoresRes = useResource(() => q.matchScores(mid()), opts)
  const holesRes = useResource(() => q.matchHoles(mid()), opts)

  // Whether a missing tee set is fatal decides what to render, not what to cache. Carried in
  // the key it gave each view a whole copy of the match to keep in step.
  const parts = [teamsRes, resultsRes, scoresRes]
  const { error, loading, retry } = combine(parOptional ? parts : [...parts, holesRes])

  const teams = computed(() => teamsRes.data.value ?? [])
  const results = computed(() => resultsRes.data.value ?? [])
  // holeStates is the per-hole match state (who's up); holes is the tee set's par/yardage.
  const holeStates = computed(() => scoresRes.data.value ?? [])
  const holes = computed(() => holesRes.data.value ?? [])
  const match = computed(() => results.value.find((m) => m.match_id === mid()) ?? null)

  const { left, right } = useMatchSides(
    () => match.value,
    () => teams.value,
  )

  return { error, loading, refresh: retry, retry, teams, results, holeStates, holes, match, left, right }
}
