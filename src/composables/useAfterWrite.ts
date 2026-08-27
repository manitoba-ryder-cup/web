import { useQueryClient } from '@tanstack/vue-query'
import { q } from '@/api/queries'

// Everything a write could have touched. Resources are keyed by what they are, so this needs
// no list of the pages showing them and cannot miss one that was added later.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

// A match write moves the standing too, so the rest is marked stale without a fetch. The two it
// changed are refetched and awaited: the page this returns to must show what was just written.
export function useAfterMatchWrite() {
  const queryClient = useQueryClient()
  return async (tournamentId: string, matchId: string) => {
    queryClient.invalidateQueries({ refetchType: 'none' })
    await Promise.all([
      queryClient.refetchQueries({ type: 'all', queryKey: q.matchScores(matchId).key }),
      queryClient.refetchQueries({ type: 'all', queryKey: q.results(tournamentId).key }),
    ])
  }
}

// A match that is gone. Dropped rather than refetched, because there is nothing to fetch — a
// card still holding a copy serves it, and the 404 behind it is swallowed by a query with data.
export function useAfterMatchDelete() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string) => queryClient.removeQueries({ queryKey: ['match', tournamentId, matchId] })
}
