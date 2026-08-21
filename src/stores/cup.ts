import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'

// Which cup is the current one — an identity, and the one piece of server state the app
// holds centrally. The header and the tab bar are mounted once for the session and need it
// before any view has run, and the views that open on it would otherwise each spend a
// round trip re-deriving the same answer before they could ask their real question.
//
// The id only. A cup's record is read by whoever renders it, because this is a cache with
// no way to invalidate itself: anything held here is fixed until the app is reloaded,
// which is right for an identity and wrong for a name or a date someone can edit.
export const useCupStore = defineStore('cup', () => {
  const latestId = ref<string | null>(null)
  // Not a ref: nothing renders it, and callers join it rather than read it.
  let inFlight: Promise<void> | null = null

  /** Where "Scores" points: this cup, or the list until it is known — so a lookup that
   * failed leaves a worse link rather than a broken one, and the shell can ignore it. */
  const scoresTo = computed(() => (latestId.value ? `/tournaments/${latestId.value}` : '/tournaments'))

  // A second caller joins the request in flight rather than returning early, which would
  // hand it the null it reads as "there is no cup"; failure propagates for the same reason.
  // A retry arriving while a request is stalled joins that one rather than issuing its own,
  // so recovery waits on the stall.
  async function load(): Promise<void> {
    if (latestId.value) return
    inFlight ??= scorecardApi
      .listTournaments()
      .then((ts) => {
        latestId.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? null
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  return { latestId, scoresTo, load }
})
