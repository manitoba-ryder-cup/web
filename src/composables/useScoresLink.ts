import { ref, computed, type ComputedRef } from 'vue'
import { scorecardApi } from '@/api/scorecard'

// Module scope, so the header and the nav bar share one lookup rather than each firing
// their own on mount.
const latestTournamentId = ref<string | null>(null)
let started = false

/** Where "Scores" points: the most recent tournament, or the list until that resolves. */
export function useScoresLink(): ComputedRef<string> {
  if (!started) {
    started = true
    scorecardApi
      .listTournaments()
      .then((ts) => {
        latestTournamentId.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? null
      })
      // Reads are public, so this runs signed out too. A failure leaves the list fallback,
      // which is a worse link but never a broken one.
      .catch(() => {})
  }
  return computed(() => (latestTournamentId.value ? `/tournaments/${latestTournamentId.value}` : '/tournaments'))
}

/** Tests need each case to start from nothing. */
export function resetScoresLink() {
  latestTournamentId.value = null
  started = false
}
