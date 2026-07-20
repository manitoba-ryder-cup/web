import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useAsync } from '@/composables/useAsync'

function harness<T>(fetcher: () => Promise<T>) {
  return defineComponent({ setup() { return useAsync(fetcher) }, template: '<div/>' })
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
