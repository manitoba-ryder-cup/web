import { useQueryClient } from '@tanstack/vue-query'

// Hole entry is the exception: a refetch mid-entry moves the ground under someone with
// strokes already dialled in.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'match' })
}

// eslint-disable-next-line comment-cap/max-lines -- the two-keys-per-match part is the whole
// reason this exists, and a reader who does not know it deletes this as a duplicate of above
// The exception's exception. Saving a hole leaves the entry page, so the rule above protects
// nothing — and the card it returns to holds the same match under a key of its own, because
// the two views disagree about whether a missing tee set is an error. Refetched rather than
// invalidated, and awaited, so the card renders what was just written.
export function useAfterHoleSaved() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string) =>
    queryClient.refetchQueries({
      type: 'all',
      predicate: (q) => q.queryKey[0] === 'match' && q.queryKey[1] === tournamentId && q.queryKey[2] === matchId,
    })
}
