import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    await flushPromises()
    await nextTick()
    return w
  }

  it('opens the row named in the hash', async () => {
    const w = await mountAt('#t2', ['t1', 't2', 't3'])
    expect((w.vm as unknown as { openId: string }).openId).toBe('t2')
  })

  // The reason for `nearest`: the current cup is the first row, and `start` would pin it
  // to the top of the viewport, pushing the player's avatar and record off screen to
  // reveal something the reader could already see.
  it('scrolls by the least amount needed, never to the top', async () => {
    await mountAt('#t1', ['t1', 't2'])
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('leaves everything shut when there is no hash', async () => {
    const w = await mountAt('', ['t1', 't2'])
    expect((w.vm as unknown as { openId: string }).openId).toBe('')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  // The profile's back link is a pure function of the route, so anything that rewrites the
  // URL has to leave the rest of it alone: an omitted query resolves to empty, which would
  // turn "back to History" into "back to Teams" on the first row anyone opened.
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
