// jsdom implements no scrolling, so anything that positions itself on mount (the stroke
// strip) throws on scrollTo. There is no layout to assert on either way — the tests that
// care about the strip check which tile is selected, not where the track sits.
//
// Guarded because this file is setup for every suite, and the Worker tests run under the
// node environment where there is no DOM to patch.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Every mounted component gets a Query cache, and a fresh one per test — a shared client
// would let one test serve another's cached data, which reads as a passing test for a
// query that never ran. Retries are off: they are right in the field and, here, only turn
// a failing assertion into a timeout.
if (typeof Element !== 'undefined') {
  const { config } = await import('@vue/test-utils')
  const { VueQueryPlugin, QueryClient } = await import('@tanstack/vue-query')
  const { beforeEach } = await import('vitest')
  beforeEach(() => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    })
    config.global.plugins = [[VueQueryPlugin, { queryClient }]]
  })
}
