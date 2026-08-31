import { useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { matchKey, q } from '@/api/queries'
import type { MatchResult, ScoreSubmissionResult } from '@/api/types'

// A score cannot move a tee set, so a hole write leaves it alone. Only a score: a match write
// moves the course and the tee colour, which is where par and yardage come from.
function staleExceptTeeSet(queryClient: QueryClient, matchId: string) {
  const teeSet = q.matchHoles(matchId).key
  const isTeeSet = (key: readonly unknown[]) => key.length === teeSet.length && key.every((part, i) => part === teeSet[i])
  queryClient.invalidateQueries({ refetchType: 'none', predicate: (query) => !isTeeSet(query.queryKey) })
}

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

// A hole write answers with everything a score moves, so what it lands in is written from that
// answer rather than read back — nothing stands between the tap and the card.
export function useAfterHoleWrite() {
  const queryClient = useQueryClient()
  const afterMatchWrite = useAfterMatchWrite()
  return async (tournamentId: string, matchId: string, { holes, ...row }: ScoreSubmissionResult) => {
    // Both of them or neither. An answer without the holes would move the standing onto this
    // score and leave the card behind it, which reads as the save that did not take.
    if (!holes) return afterMatchWrite(tournamentId, matchId)
    staleExceptTeeSet(queryClient, matchId)
    queryClient.setQueryData(q.matchScores(matchId).key, holes)
    queryClient.setQueryData<MatchResult[]>(q.results(tournamentId).key, (rows) =>
      rows?.map((m) => (m.match_id === matchId ? { ...m, ...row } : m)),
    )
  }
}

// A match that is gone. Dropped rather than refetched, because there is nothing to fetch — a
// card still holding a copy serves it, and the 404 behind it is swallowed by a query with data.
export function useAfterMatchDelete() {
  const queryClient = useQueryClient()
  return (matchId: string) => queryClient.removeQueries({ queryKey: matchKey(matchId) })
}
