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
  // The sentence the services answer a fault with, so the two cannot drift apart.
  it('falls back to a generic message for non-Error throws', async () => {
    const w = mount(harness(() => Promise.reject('weird')))
    await flushPromises()
    expect(w.vm.error).toBe('Sorry, something went wrong. Please try again later.')
  })
  // A view whose route param changes reloads through the same useAsync, and what is on
  // screen belongs to the id that just went away. Views render their identity — a hero, a
  // title — outside AsyncState, where the error branch does not cover it, so holding the
  // old answer puts the last player's name under the new player's URL.
  it('drops what it was showing when a new load starts', async () => {
    let answer = 'first'
    const w = mount(harness(() => Promise.resolve(answer)))
    await flushPromises()
    expect(w.vm.data).toBe('first')

    answer = 'second'
    w.vm.retry()
    expect(w.vm.data).toBeNull()
    await flushPromises()
    expect(w.vm.data).toBe('second')
  })

  it('leaves nothing of the old answer behind when the new load fails', async () => {
    let fail = false
    const w = mount(harness(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve('first'))))
    await flushPromises()

    fail = true
    w.vm.retry()
    await flushPromises()

    expect(w.vm.data).toBeNull()
    expect(w.vm.error).toBe('offline')
  })

  // Tapping through links faster than the network settles leaves two loads out at once.
  // Whichever the network happens to answer last would otherwise win.
  it('ignores a response overtaken by a newer load', async () => {
    const pending: ((v: string) => void)[] = []
    const w = mount(harness(() => new Promise<string>((resolve) => pending.push(resolve))))
    pending[0]('first')
    await flushPromises()

    w.vm.retry()
    w.vm.retry()
    pending[2]('third')
    await flushPromises()
    expect(w.vm.data).toBe('third')
    expect(w.vm.loading).toBe(false)

    // The overtaken one lands late and must change nothing.
    pending[1]('second')
    await flushPromises()
    expect(w.vm.data).toBe('third')
  })

  // The mixed case: the abandoned request fails while the current one succeeded. Its
  // message would otherwise put an error banner over a correctly loaded page.
  it('does not let an overtaken failure report over a page that loaded', async () => {
    const pending: { resolve: (v: string) => void; reject: (e: Error) => void }[] = []
    const w = mount(harness(() => new Promise<string>((resolve, reject) => pending.push({ resolve, reject }))))
    pending[0].resolve('first')
    await flushPromises()

    w.vm.retry()
    w.vm.retry()
    pending[2].resolve('third')
    await flushPromises()

    pending[1].reject(new Error('offline'))
    await flushPromises()

    expect(w.vm.error).toBe('')
    expect(w.vm.data).toBe('third')
    expect(w.vm.loading).toBe(false)
  })
})
