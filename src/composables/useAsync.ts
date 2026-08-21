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
  // Every visible load takes the next ticket. A response holding an old one is answering a
  // question the view has stopped asking — the id in its route changed underneath it — so
  // it is dropped rather than written over a newer answer. Without this, two loads in
  // flight land in whatever order the network returns them.
  let ticket = 0

  // Background refresh: no loading flicker, no overlapping requests, and a transient
  // failure keeps the last good data on screen rather than blanking the view.
  async function refresh() {
    if (inFlight) return
    inFlight = true
    const mine = ticket
    try {
      const fresh = await fetcher()
      // A visible load started while this poll was out and owns the state now.
      if (mine !== ticket) return
      data.value = fresh
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
    const mine = ++ticket
    loading.value = true
    // Whatever is on screen answers the request this one just replaced. Keeping it would
    // leave the last player's hero standing under the new player's URL when this load
    // fails — the view renders its identity outside the error branch.
    data.value = null
    try {
      const fresh = await fetcher()
      if (mine !== ticket) return
      data.value = fresh
      error.value = ''
    } catch (e) {
      if (mine !== ticket) return
      // Never empty: an empty error renders as a loaded page with nothing in it.
      error.value = displayError(e)
    } finally {
      // Only the newest load may end the loading state; an older one finishing would
      // uncover a page still waiting for its own answer.
      if (mine === ticket) loading.value = false
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
