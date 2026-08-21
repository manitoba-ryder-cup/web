import { useQueryClient } from '@tanstack/vue-query'

// A write changes what other pages show, and they have to be told. The live views
// (dashboard, tournament, match) poll and heal themselves within twenty seconds, and hole
// entry deliberately does not refetch while someone is entering, so neither is listed
// here. What is left is the public team sheet and every other admin page: the admin views
// do not poll and offer no refresh once loaded, so a roster edit that never reached the
// lineup page leaves a drafted player missing from it with no way back but a reload.
export function useAfterWrite() {
  const queryClient = useQueryClient()
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ['teams'] }), queryClient.invalidateQueries({ queryKey: ['admin'] })])
}
