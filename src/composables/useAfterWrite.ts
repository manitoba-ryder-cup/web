import { useQueryClient } from '@tanstack/vue-query'

// Hole entry is the exception: a refetch mid-entry moves the ground under someone with
// strokes already dialled in.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'match' })
}

// eslint-disable-next-line comment-cap/max-lines -- the two-keys part is why this exists
// Saving a hole leaves the entry page, so the rule above protects nothing — and the card it
// returns to holds the same match under a key of its own. Refetched rather than invalidated,
// and awaited, so the card renders what was just written.
export function useAfterHoleSaved() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string) =>
    queryClient.refetchQueries({
      type: 'all',
      predicate: (q) => q.queryKey[0] === 'match' && q.queryKey[1] === tournamentId && q.queryKey[2] === matchId,
    })
}
