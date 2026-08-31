import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { useHashAccordion } from '@/composables/useHashAccordion'

// jsdom has no layout and no scrollIntoView, so the assertion is on how it was asked to
// scroll rather than on where the page ended up.
const scrollIntoView = vi.fn()

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/players/:id', name: 'player', component: { template: '<div/>' } }],
})

// Renders the anchors BaseAccordion builds, so getElementById finds something real.
const Host = defineComponent({
  props: { ids: { type: Array as () => string[], required: true } },
  setup(props) {
    const list = ref(props.ids)
    const { openId, toggle } = useHashAccordion(() => list.value)
    return { openId, toggle, list }
  },
  template: `<div><div v-for="i in list" :key="i" :id="'accordion-' + i">{{ i }}</div></div>`,
})

describe('useHashAccordion', () => {
  // Unmounted between cases: these attach to the document and share a router, so one left
  // mounted still answers the next case's navigation and scrolls on its behalf.
  const mounted: { unmount: () => void }[] = []
  afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  const mountAt = async (hash: string, ids: string[]) => {
    // Awaited: the router is shared across these cases, and isReady() only settles the
    // first navigation, so an un-awaited push leaves the previous test's hash live.
    await router.push(`/players/p1${hash}`)
    // Attached, because the composable finds its row with document.getElementById and a
    // detached mount is not in the document.
    const w = mount(Host, { props: { ids }, attachTo: document.body, global: { plugins: [router] } })
    mounted.push(w)
    await flushPromises()
    await nextTick()
    return w
  }

  it('opens the row named in the hash', async () => {
    const w = await mountAt('#t2', ['t1', 't2', 't3'])
    expect((w.vm as unknown as { openId: string }).openId).toBe('t2')
  })

  // `start` would pin the first row to the viewport top, pushing the avatar and record off to
  // reveal something already visible.
  it('scrolls by the least amount needed, never to the top', async () => {
    await mountAt('#t1', ['t1', 't2'])
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  // A tap is its own scroll. The row expands under a finger already on it, and an open row is
  // taller than a phone — which sends `nearest` to the top edge, the one thing it avoids.
  it('does not scroll a row the reader opened by tapping it', async () => {
    const w = await mountAt('', ['t1', 't2'])
    expect(scrollIntoView).not.toHaveBeenCalled()

    ;(w.vm as unknown as { toggle: (id: string) => void }).toggle('t1')
    await flushPromises()
    await nextTick()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('leaves everything shut when there is no hash', async () => {
    const w = await mountAt('', ['t1', 't2'])
    expect((w.vm as unknown as { openId: string }).openId).toBe('')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  // An omitted query resolves to empty, which turns "back to History" into "back to Teams" on
  // the first row anyone opened.
  it('keeps the query when it moves the hash', async () => {
    const w = await mountAt('', ['t1', 't2'])
    await router.replace({ path: '/players/p1', query: { from: 'history' } })

    ;(w.vm as unknown as { toggle: (id: string) => void }).toggle('t1')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#t1')
    expect(router.currentRoute.value.query.from).toBe('history')
  })

  // A hash naming a cup this player never played must not open a row or move the page.
  it('ignores a hash that matches no row', async () => {
    const w = await mountAt('#nope', ['t1', 't2'])
    expect((w.vm as unknown as { openId: string }).openId).toBe('')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
