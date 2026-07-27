import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useAsync } from '@/composables/useAsync'

function harness<T>(fetcher: () => Promise<T>) {
  return defineComponent({
    setup() {
      return useAsync(fetcher)
    },
    template: '<div/>',
  })
}

describe('useAsync', () => {
  it('exposes data on success and clears loading', async () => {
    const w = mount(harness(() => Promise.resolve(42)))
    expect(w.vm.loading).toBe(true)
    await flushPromises()
    expect(w.vm.loading).toBe(false)
    expect(w.vm.data).toBe(42)
    expect(w.vm.error).toBe('')
  })
  it('never leaves the error empty, whatever was thrown', async () => {
    // An empty message reads as "no error" to anything checking truthiness, which renders
    // a failed load as a loaded-but-empty page.
    const w = mount(harness(() => Promise.reject(new Error(''))))
    await flushPromises()
    expect(w.vm.error).toBeTruthy()
  })

  it('retries a failed load and clears the error once it succeeds', async () => {
    // A phone on a golf course drops requests; without this the view is stuck on the
    // error until the user thinks to reload the page.
    let attempt = 0
    const w = mount(harness(() => (++attempt === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(7))))
    await flushPromises()
    expect(w.vm.error).toBe('boom')

    const pending = w.vm.retry()
    expect(w.vm.loading).toBe(true)
    await pending
    await flushPromises()

    expect(w.vm.error).toBe('')
    expect(w.vm.data).toBe(7)
    expect(w.vm.loading).toBe(false)
  })

  it('reports a retry that fails as well, rather than leaving the first message', async () => {
    let attempt = 0
    const w = mount(harness(() => Promise.reject(new Error(`fail ${++attempt}`))))
    await flushPromises()
    expect(w.vm.error).toBe('fail 1')

    await w.vm.retry()
    await flushPromises()

    expect(w.vm.error).toBe('fail 2')
    expect(w.vm.loading).toBe(false)
  })

  it('captures a friendly message from an Error', async () => {
    const w = mount(harness(() => Promise.reject(new Error('boom'))))
    await flushPromises()
    expect(w.vm.error).toBe('boom')
    expect(w.vm.data).toBe(null)
    expect(w.vm.loading).toBe(false)
  })
  it('falls back to a generic message for non-Error throws', async () => {
    const w = mount(harness(() => Promise.reject('weird')))
    await flushPromises()
    expect(w.vm.error).toBe('Something went wrong')
  })
})
