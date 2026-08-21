import { ref, computed, type ComputedRef } from 'vue'
import { scorecardApi } from '@/api/scorecard'

// Module scope, so the header and the nav bar share one lookup rather than each firing
// their own on mount.
const latestTournamentId = ref<string | null>(null)
let started = false

// The header and the tab bar ask once each, in setup, and never again — so a single
// failure used to leave Scores pointing at the history list for the whole session. The
// case this is for is a cold start on a weak connection, which is the one it kept losing.
const ATTEMPTS = 3
const BACKOFF_MS = 2000

function load(attempt = 1) {
  scorecardApi
    .listTournaments()
    .then((ts) => {
      latestTournamentId.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? null
    })
    // Reads are public, so this runs signed out too. Once the attempts are spent the list
    // fallback stands: a worse link, but never a broken one.
    .catch(() => {
      if (attempt < ATTEMPTS) setTimeout(() => load(attempt + 1), BACKOFF_MS * attempt)
    })
}

/** Where "Scores" points: the most recent tournament, or the list until that resolves. */
export function useScoresLink(): ComputedRef<string> {
  if (!started) {
    started = true
    load()
  }
  return computed(() => (latestTournamentId.value ? `/tournaments/${latestTournamentId.value}` : '/tournaments'))
}

/** Tests need each case to start from nothing. */
export function resetScoresLink() {
  latestTournamentId.value = null
  started = false
}
