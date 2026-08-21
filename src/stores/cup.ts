import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament } from '@/api/types'

// Which cup is the current one — the one thing the app holds centrally. The header and the
// tab bar are mounted once for the session and need it before any view has run, and the
// views that open on it would otherwise each spend a round trip re-deriving the same
// answer before they could ask their real question.
export const useCupStore = defineStore('cup', () => {
  const current = ref<Tournament | null>(null)
  // Not a ref: nothing renders it, and callers join it rather than read it.
  let inFlight: Promise<void> | null = null

  const latestId = computed(() => current.value?.id ?? null)

  /** Where "Scores" points: this cup, or the list until it is known. */
  const scoresTo = computed(() => (latestId.value ? `/tournaments/${latestId.value}` : '/tournaments'))

  // Reads are public, so this runs signed out too. Callers await it for the value, so a
  // second one has to join the request in flight — returning early would hand it the null
  // it reads as "there is no cup". Failure propagates for the same reason: a view that
  // swallowed it would render "no cup yet", which is a claim about data it never got. The
  // shell catches instead, since a worse link beats a broken header. Nothing is latched
  // either way, so the next caller retries.
  async function load(): Promise<void> {
    if (current.value) return
    inFlight ??= scorecardApi
      .listTournaments()
      .then((ts) => {
        current.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  return { current, latestId, scoresTo, load }
})
