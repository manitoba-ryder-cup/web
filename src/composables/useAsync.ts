import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { displayError } from '@/lib/displayError'

interface UseAsyncOptions {
  // Silently re-fetch on this cadence (ms) while the tab is visible. A getter, so a view
  // can change its mind; `false` means do not poll, which is not the same as not asking.
  intervalMs?: MaybeRefOrGetter<number | false>
  // Off for a view that must not have the ground move under it — coming back to the tab
  // is otherwise a refetch, which is the one thing a load-once flow asked not to happen.
  refetchOnFocus?: boolean
}

// Standard fetch state for every data view: data (undefined until loaded), a friendly
// error string, and loading. Backed by a keyed cache, so returning to a page renders what
// it already had and checks behind it — the skeleton is for a page with nothing to show,
// never for a revisit.
//
// `key` identifies the cached entry. Everything the fetcher reads must appear in it or two
// pages will share one cache line and show each other's data.
export function useAsync<T>(key: MaybeRefOrGetter<readonly unknown[]>, fetcher: () => Promise<T>, options: UseAsyncOptions = {}) {
  const q = useQuery({
    queryKey: computed(() => toValue(key)),
    queryFn: fetcher,
    refetchInterval: computed(() => toValue(options.intervalMs) ?? false),
    refetchOnWindowFocus: options.refetchOnFocus ?? true,
    // A hidden tab is not being read; it catches up when it comes back.
    refetchIntervalInBackground: false,
  })

  // Only a load with nothing to show is the view's failure to report. A poll that blips
  // keeps the last good data on screen rather than blanking a page someone is reading.
  const error = computed(() => (q.isError.value && q.data.value === undefined ? displayError(q.error.value) : ''))

  // isPending, not isFetching: a background revalidation must not put the skeleton back
  // over data already on screen. The second clause covers a retry after a failure, where
  // there is still nothing to show and the spinner is the honest state.
  const loading = computed(() => q.isPending.value || (q.isFetching.value && q.data.value === undefined))

  // Returns the promise: a caller that wants to wait for the result can, and the retry
  // button ignoring it costs nothing.
  const refresh = () => q.refetch().then(() => undefined)

  // The only way to apply an optimistic update. `data` is a readonly view of the cache, so
  // assigning through it is dropped rather than refused — the write reaches the server and
  // the row never moves. Return the new value; don't mutate what you were handed.
  const queryClient = useQueryClient()
  const patch = (update: (current: T) => T) =>
    queryClient.setQueryData<T>(toValue(key), (current) => (current === undefined ? current : update(current)))

  return { data: q.data, error, loading, refresh, retry: refresh, patch }
}
