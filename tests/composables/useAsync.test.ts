import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref, type Ref } from 'vue'
import { useAsync } from '@/composables/useAsync'

// One component factory for both shapes: a fixed key, or one that follows `id` the way a
// view's key follows its route param.
function harness<T>(fetcher: () => Promise<T>) {
  const id: Ref<string> = ref('first')
  const comp = defineComponent({
    setup() {
      return { id, ...useAsync(() => ['thing', id.value], fetcher) }
    },
    template: '<div/>',
  })
  return { comp, id, mountIt: () => mount(comp) }
}

describe('useAsync', () => {
  it('exposes data on success and clears loading', async () => {
    const w = harness(() => Promise.resolve(42)).mountIt()
    expect(w.vm.loading).toBe(true)
    await flushPromises()
    expect(w.vm.loading).toBe(false)
    expect(w.vm.data).toBe(42)
    expect(w.vm.error).toBe('')
  })

  it('never leaves the error empty, whatever was thrown', async () => {
    // An empty message reads as "no error" to anything checking truthiness, which renders
    // a failed load as a loaded-but-empty page.
    const w = harness(() => Promise.reject(new Error(''))).mountIt()
    await flushPromises()
    expect(w.vm.error).toBeTruthy()
  })

  it('captures a friendly message from an Error', async () => {
    const w = harness(() => Promise.reject(new Error('boom'))).mountIt()
    await flushPromises()
    expect(w.vm.error).toBe('boom')
    expect(w.vm.data).toBeUndefined()
    expect(w.vm.loading).toBe(false)
  })

  // The sentence the services answer a fault with, so the two cannot drift apart.
  it('falls back to a generic message for non-Error throws', async () => {
    const w = harness(() => Promise.reject('weird')).mountIt()
    await flushPromises()
    expect(w.vm.error).toBe('Sorry, something went wrong. Please try again later.')
  })

  it('retries a failed load and clears the error once it succeeds', async () => {
    // A phone on a golf course drops requests; without this the view is stuck on the
    // error until the user thinks to reload the page.
    let attempt = 0
    const w = harness(() => (++attempt === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(7))).mountIt()
    await flushPromises()
    expect(w.vm.error).toBe('boom')

    const pending = w.vm.retry()
    expect(w.vm.loading).toBe(true) // nothing to show, so the spinner is the honest state
    await pending
    await flushPromises()

    expect(w.vm.error).toBe('')
    expect(w.vm.data).toBe(7)
    expect(w.vm.loading).toBe(false)
  })

  it('reports a retry that fails as well, rather than leaving the first message', async () => {
    let attempt = 0
    const w = harness(() => Promise.reject(new Error(`fail ${++attempt}`))).mountIt()
    await flushPromises()
    expect(w.vm.error).toBe('fail 1')

    await w.vm.retry()
    await flushPromises()

    expect(w.vm.error).toBe('fail 2')
    expect(w.vm.loading).toBe(false)
  })

  // Views render their identity — a hero, a title — outside AsyncState, where the error
  // branch does not cover it. Holding the previous answer would put the last player's name
  // under the new player's URL. The key is what guarantees this now: a different id is a
  // different cache entry, so there is nothing of the old one to show.
  it('shows nothing of the previous answer once the key changes', async () => {
    // Asserted while the second request is still out, not after it lands: holding the old
    // answer only for the duration of the new load is exactly the bug, and a check that
    // waits for the end cannot see it.
    let release: (v: string) => void = () => {}
    let first = true
    const { comp, id } = harness(() => {
      if (first) {
        first = false
        return Promise.resolve('first')
      }
      return new Promise<string>((r) => (release = r))
    })
    const w = mount(comp)
    await flushPromises()
    expect(w.vm.data).toBe('first')

    id.value = 'second'
    await flushPromises()
    expect(w.vm.data).toBeUndefined()

    release('second')
    await flushPromises()
    expect(w.vm.data).toBe('second')
  })

  it('reports a failure under a new key rather than the answer from the old one', async () => {
    let fail = false
    const { comp, id } = harness(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve('first')))
    const w = mount(comp)
    await flushPromises()

    fail = true
    id.value = 'second'
    await flushPromises()

    expect(w.vm.data).toBeUndefined()
    expect(w.vm.error).toBe('offline')
  })

  // The point of the cache: a revisit renders what it already had while the check runs
  // behind it. Blanking here is what used to put a skeleton over every tab switch.
  it('keeps what is on screen while it refetches the same key', async () => {
    let answer = 'first'
    const w = harness(() => Promise.resolve(answer)).mountIt()
    await flushPromises()

    answer = 'second'
    const pending = w.vm.retry()

    expect(w.vm.data).toBe('first') // still readable while the request is out
    expect(w.vm.loading).toBe(false) // and no skeleton over it
    await pending
    await flushPromises()
    expect(w.vm.data).toBe('second')
  })

  // A poll that blips must not blank a page someone is reading.
  it('keeps the last good data when a refetch fails', async () => {
    let fail = false
    const w = harness(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve('good'))).mountIt()
    await flushPromises()

    fail = true
    await w.vm.retry()
    await flushPromises()

    expect(w.vm.data).toBe('good')
    expect(w.vm.error).toBe('')
  })
})
