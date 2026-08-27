import { useQueryClient } from '@tanstack/vue-query'

// Hole entry is the exception: a refetch mid-entry moves the ground under someone with
// strokes already dialled in.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'match' })
}

// eslint-disable-next-line comment-cap/max-lines -- the two-keys part is why this exists
// One match is held under a key per view, so a write to it has to reach every copy — the rule
// above protects a reader entering scores, and leaves the others stale. Refetched rather than
// invalidated, and awaited, so what the caller shows next is what it just wrote.
export function useAfterMatchWrite() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string) =>
    queryClient.refetchQueries({
      type: 'all',
      predicate: (q) => q.queryKey[0] === 'match' && q.queryKey[1] === tournamentId && q.queryKey[2] === matchId,
    })
}
