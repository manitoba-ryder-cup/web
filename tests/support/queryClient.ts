import { config } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

// tests/setup.ts installs a client with gcTime 0, which drops an entry as its last observer
// unmounts. A test watching a write reach the next page needs one that outlives that.
export function withQueryClient(defaults: { staleTime?: number; gcTime?: number } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 60_000, ...defaults } },
  })
  config.global.plugins = [[VueQueryPlugin, { queryClient }]]
  return queryClient
}
