import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'

// The id only. A record read here would be fixed until the app reloads, which is right for an
// identity and wrong for a name or a date someone can edit.
export const useCupStore = defineStore('cup', () => {
  const latestId = ref<string | null>(null)
  // Not a ref: nothing renders it, and callers join it rather than read it.
  let inFlight: Promise<void> | null = null

  /** Where "Scores" points: this cup, or the list until it is known — so a lookup that
   * failed leaves a worse link rather than a broken one, and the shell can ignore it. */
  const scoresTo = computed(() => (latestId.value ? `/tournaments/${latestId.value}` : '/tournaments'))

  // A joiner waits rather than returning early to the null it reads as "there is no cup".
  // A retry during a stall joins it, so recovery waits on the stall.
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
