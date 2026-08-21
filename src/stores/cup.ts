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

  /** Where "Scores" points: this cup, or the list until it is known — so a lookup that
   * failed leaves a worse link rather than a broken one, and the shell can ignore it. */
  const scoresTo = computed(() => (latestId.value ? `/tournaments/${latestId.value}` : '/tournaments'))

  // A second caller joins the request in flight rather than returning early, which would
  // hand it the null it reads as "there is no cup"; failure propagates for the same reason.
  // Resolved, the cup is then fixed for the session: a caller wanting the record fresh
  // re-reads it by id. A retry arriving while a request is stalled joins that one rather
  // than issuing its own, so recovery waits on the stall.
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
