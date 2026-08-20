import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { displayError } from '@/lib/displayError'

interface UseAsyncOptions {
  // When set, silently re-fetch on this cadence (ms) while the tab is visible, so live
  // views (scores, standings) stay current without a manual refresh.
  intervalMs?: number
}

// Standard fetch-on-mount state used by every data view: data (null until loaded), a
// friendly error string, and loading. Optionally polls in the background.
export function useAsync<T>(fetcher: () => Promise<T>, options: UseAsyncOptions = {}) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref('')
  const loading = ref(true)
  let inFlight = false

  // Background refresh: no loading flicker, no overlapping requests, and a transient
  // failure keeps the last good data on screen rather than blanking the view.
  async function refresh() {
    if (inFlight) return
    inFlight = true
    try {
      data.value = await fetcher()
      error.value = ''
    } catch {
      // Keep existing data — a poll blip shouldn't disrupt the view.
    } finally {
      inFlight = false
    }
  }

  // The visible load: shows the spinner and reports failure. Also what a user-triggered
  // retry runs, so a request that dropped on a bad connection is one tap from recovering
  // instead of needing the page reloaded.
  async function load() {
    loading.value = true
    try {
      data.value = await fetcher()
      error.value = ''
    } catch (e) {
      // Never empty: an empty error renders as a loaded page with nothing in it.
      error.value = displayError(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  if (options.intervalMs) {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (!timer) timer = setInterval(refresh, options.intervalMs)
    }
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    // Don't poll a backgrounded tab; catch up immediately when it returns.
    const onVisibility = () => {
      if (document.hidden) stop()
      else {
        refresh()
        start()
      }
    }
    onMounted(() => {
      if (!document.hidden) start()
      document.addEventListener('visibilitychange', onVisibility)
    })
    onUnmounted(() => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    })
  }

  return { data, error, loading, refresh, retry: load }
}
