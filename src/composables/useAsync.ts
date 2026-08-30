import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import type { Resource } from '@/api/queries'
import { displayError } from '@/lib/displayError'

interface UseAsyncOptions {
  // Silently re-fetch on this cadence (ms) while the tab is visible. A getter, so a view
  // can change its mind; `false` means do not poll, which is not the same as not asking.
  intervalMs?: MaybeRefOrGetter<number | false>
  // Off for a view that must not have the ground move under it — coming back to the tab
  // is otherwise a refetch, which is the one thing a load-once flow asked not to happen.
  refetchOnFocus?: boolean
  // For a resource whose id is not known yet. It reads as loading rather than as empty, which
  // is the difference between a skeleton and a page claiming there is no cup.
  enabled?: MaybeRefOrGetter<boolean>
}

// `key` identifies the cached entry, and everything the fetcher reads must appear in it or
// two pages share one cache line and show each other's data.
export function useAsync<T>(key: MaybeRefOrGetter<readonly unknown[]>, fetcher: () => Promise<T>, options: UseAsyncOptions = {}) {
  // A disabled query reports nothing of its own: it is waiting on something whose state the
  // page already shows, and a stale error or skeleton from it would be that thing said twice.
  const enabled = computed(() => toValue(options.enabled) ?? true)

  const q = useQuery({
    queryKey: computed(() => toValue(key)),
    queryFn: fetcher,
    refetchInterval: computed(() => toValue(options.intervalMs) ?? false),
    refetchOnWindowFocus: options.refetchOnFocus ?? true,
    enabled,
    // A hidden tab is not being read; it catches up when it comes back.
    refetchIntervalInBackground: false,
  })

  // Only a load with nothing to show is the view's failure to report. A poll that blips
  // keeps the last good data on screen rather than blanking a page someone is reading.
  const error = computed(() => (enabled.value && q.isError.value && q.data.value === undefined ? displayError(q.error.value) : ''))

  // isPending, not isFetching, or a background revalidation puts the skeleton back over data
  // on screen. The second clause is a retry after a failure, where there is still nothing.
  const loading = computed(() => enabled.value && (q.isPending.value || (q.isFetching.value && q.data.value === undefined)))

  // Gated, because refetch() does not consult `enabled`: a disabled query would answer a retry
  // with a request for the id it is still waiting on. The promise is returned for a caller.
  const refresh = () => (enabled.value ? q.refetch().then(() => undefined) : Promise.resolve())

  // `data` is a readonly view of the cache, so assigning through it is dropped rather than
  // refused — the write reaches the server and the row never moves.
  const queryClient = useQueryClient()
  const patch = (update: (current: T) => T) =>
    queryClient.setQueryData<T>(toValue(key), (current) => (current === undefined ? current : update(current)))

  return { data: q.data, error, loading, refresh, retry: refresh, patch }
}

// A resource rather than a key and a fetcher spelled out separately, so the two cannot name
// different things.
export function useResource<T>(resource: () => Resource<T>, options: UseAsyncOptions = {}) {
  return useAsync<T>(
    () => resource().key,
    () => resource().fetch(),
    options,
  )
}

interface Combinable {
  error: { value: string }
  loading: { value: boolean }
  retry: () => Promise<void>
}

// One loading state and one error for a page built from several resources. The first error
// wins: a page with nothing to show says so once, not once per request that failed.
export function combine(parts: Combinable[]) {
  return {
    loading: computed(() => parts.some((p) => p.loading.value)),
    error: computed(() => parts.map((p) => p.error.value).find(Boolean) ?? ''),
    retry: () => Promise.all(parts.map((p) => p.retry())).then(() => undefined),
  }
}
