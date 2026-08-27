import { useQueryClient } from '@tanstack/vue-query'

// Hole entry is the exception: a refetch mid-entry moves the ground under someone with
// strokes already dialled in.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'match' })
}

// The key stops short of parOptional so it reaches both of a match's copies, and `all` the one
// no view has mounted. Refetched, not invalidated, so what the caller shows next is what it just wrote.
export function useAfterMatchWrite() {
  const queryClient = useQueryClient()
  return (tournamentId: string, matchId: string) => queryClient.refetchQueries({ queryKey: ['match', tournamentId, matchId], type: 'all' })
}
