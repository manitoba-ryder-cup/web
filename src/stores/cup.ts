import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'

// The one piece of server state the app holds centrally: which cup is the current one.
// Everything else is fetched per view, but the header and the tab bar are mounted once for
// the session and need this before any view has run — and asking twice for one answer is
// what a store is for.
export const useCupStore = defineStore('cup', () => {
  const latestId = ref<string | null>(null)
  const loading = ref(false)

  /** Where "Scores" points: this cup, or the list until it is known. */
  const scoresTo = computed(() => (latestId.value ? `/tournaments/${latestId.value}` : '/tournaments'))

  // Reads are public, so this runs signed out too. A failure leaves the list fallback — a
  // worse link, never a broken one — and leaves `latestId` null so the next caller retries.
  async function load() {
    if (loading.value || latestId.value) return
    loading.value = true
    try {
      const ts = await scorecardApi.listTournaments()
      latestId.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? null
    } catch {
      // left null on purpose: unresolved rather than resolved-to-nothing
    } finally {
      loading.value = false
    }
  }

  return { latestId, scoresTo, load }
})
