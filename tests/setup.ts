// jsdom has no scrolling, so anything positioning itself on mount throws on scrollTo. Guarded
// because this is setup for every suite, and the Worker tests run under node with no DOM.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// A fresh client per test: a shared one lets a test serve another's cached data, which reads
// as a pass for a query that never ran. Retries off, or a failure becomes a timeout.
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
