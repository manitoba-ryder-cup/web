import { useQueryClient } from '@tanstack/vue-query'

// Hole entry is the exception: a refetch mid-entry moves the ground under someone with
// strokes already dialled in.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'match' })
}
