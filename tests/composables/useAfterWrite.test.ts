import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { QueryClient, VueQueryPlugin, useQuery } from '@tanstack/vue-query'
import { useAfterWrite } from '@/composables/useAfterWrite'

// One query per key, so a write can be watched for which of them it reaches.
function mountWith(keys: readonly (readonly unknown[])[]) {
  const fetches = new Map<string, number>()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } })
  const comp = defineComponent({
    setup() {
      for (const key of keys) {
        const name = JSON.stringify(key)
        useQuery({
          queryKey: key,
          queryFn: () => {
            fetches.set(name, (fetches.get(name) ?? 0) + 1)
            return Promise.resolve(name)
          },
        })
      }
      return { afterWrite: useAfterWrite() }
    },
    template: '<div/>',
  })
  const w = mount(comp, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
  return { w, count: (key: readonly unknown[]) => fetches.get(JSON.stringify(key)) ?? 0 }
}

describe('useAfterWrite', () => {
  // A list of keys is only right until the next view is added and nobody comes back here.
  // The dashboard and the cup page were missing from one, and the player page after them.
  it('reaches a page nobody remembered to list', async () => {
    const player = ['player', 'p1']
    const { w, count } = mountWith([player])
    await flushPromises()
    expect(count(player)).toBe(1)

    await w.vm.afterWrite()
    await flushPromises()

    expect(count(player)).toBe(2)
  })

  // The one exception, and the reason this is not simply invalidateQueries(): a refetch
  // arriving mid-entry moves the ground under someone with strokes already dialled in.
  it('leaves the match context alone, so hole entry is not refetched under the strips', async () => {
    const match = ['match', 't1', 'm1', false]
    const { w, count } = mountWith([match])
    await flushPromises()
    expect(count(match)).toBe(1)

    await w.vm.afterWrite()
    await flushPromises()

    expect(count(match)).toBe(1)
  })
})
