import { useQueryClient } from '@tanstack/vue-query'
import { matchKey, q } from '@/api/queries'
import type { MatchResult, ScoreSubmissionResult } from '@/api/types'

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

// A hole write answers with everything a score moves, so the two resources it lands in are
// written from that answer rather than read back — the page it returns to needs no request.
export function useAfterHoleWrite() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string, written: ScoreSubmissionResult) => {
    // Split where the response splits: the card's holes, and the rest, which is exactly the
    // part of a match's result a score can move.
    const { holes, ...row } = written
    queryClient.invalidateQueries({ refetchType: 'none' })
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
