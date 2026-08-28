import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import BaseTabs from '@/components/base/BaseTabs.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/tournaments', component: { template: '<div/>' } }],
})

// Unmounted between cases: a live BaseTabs writes the hash whenever the route changes
// under it, so one left mounted would rewrite the next case's URL from off-screen.
const mounted: { unmount: () => void }[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

async function mountTabs(props: { tabs: string[]; syncHash?: boolean; initial?: string }) {
  const w = mount(BaseTabs, {
    props,
    slots: { default: '<template #default="{ tab, index }">{{ index }}:{{ tab }}</template>' },
    global: { plugins: [router] },
  })
  await flushPromises()
  mounted.push(w)
  return w
}

const click = async (w: Awaited<ReturnType<typeof mountTabs>>, label: string) => {
  await w
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click')
  await flushPromises()
}

describe('BaseTabs', () => {
  beforeEach(async () => {
    // Awaited: the router is shared, and a tab click writes the hash — an un-awaited reset
    // leaves the previous case's tab open in this one.
    await router.replace('/tournaments')
  })

  it('opens on the first tab and renders only that panel', async () => {
    const w = await mountTabs({ tabs: ['Tournaments', 'Participants'] })
    expect(w.text()).toContain('0:Tournaments')
    expect(w.text()).not.toContain('1:Participants')
  })

  // The hash is what makes a tab linkable and what a refresh reads back.
  it('names the open tab in the hash, slugified', async () => {
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball'] })
    await click(w, 'Best Ball')
    expect(router.currentRoute.value.hash).toBe('#best-ball')
  })

  // replace, not push: switching tabs is one page, and filling the back button with steps
  // through it means Back stops leaving the page at all.
  it('does not add a history entry per tab', async () => {
    const before = window.history.length
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball'] })
    await click(w, 'Best Ball')
    await click(w, 'Alt Shot')
    expect(window.history.length).toBe(before)
  })

  // Followed the other way too, so Back after a tab switch — and a pasted link — land on
  // the tab the URL names rather than the one local state remembers.
  it('follows the hash when the route changes underneath it', async () => {
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball'] })
    await router.replace({ path: '/tournaments', hash: '#best-ball' })
    await flushPromises()
    expect(w.text()).toContain('1:Best Ball')
  })

  it('opens on the tab a deep link names', async () => {
    await router.replace({ path: '/tournaments', hash: '#best-ball' })
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball'] })
    expect(w.text()).toContain('1:Best Ball')
  })

  // A hash slot has one owner per page. The player profile spends its own on the open cup,
  // which is what the roster links to, so its tabs stay in local state.
  it('leaves the hash alone when it does not own it', async () => {
    const w = await mountTabs({ tabs: ['History', 'Stats'], syncHash: false })
    await click(w, 'Stats')
    expect(w.text()).toContain('1:Stats')
    expect(router.currentRoute.value.hash).toBe('')
  })

  it('opens on the tab a caller names when the hash names none', async () => {
    const w = await mountTabs({ tabs: ['Fourball', 'Alt Shot', 'Singles'], initial: 'Singles' })

    expect(w.text()).toContain('2:Singles')
  })

  // A shared link is somebody's choice; the caller's is only where to start without one.
  it('lets the hash win over the tab a caller names', async () => {
    await router.replace({ path: '/tournaments', hash: '#alt-shot' })

    const w = await mountTabs({ tabs: ['Fourball', 'Alt Shot', 'Singles'], initial: 'Singles' })

    expect(w.text()).toContain('1:Alt Shot')
  })

  it('falls back to the first tab when the named one is not there', async () => {
    const w = await mountTabs({ tabs: ['Fourball', 'Singles'], initial: 'Foursomes' })

    expect(w.text()).toContain('0:Fourball')
  })

  it('ignores a hash naming no tab it has', async () => {
    await router.replace({ path: '/tournaments', hash: '#nope' })
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball'] })
    expect(w.text()).toContain('0:Alt Shot')
  })

  // The admin lineup page builds its tabs from the formats it loaded, so the list can
  // shrink under an open tab — which would otherwise render no panel at all.
  it('falls back to the first tab when the list shrinks past the open one', async () => {
    const w = await mountTabs({ tabs: ['Alt Shot', 'Best Ball', 'Singles'] })
    await click(w, 'Singles')
    await w.setProps({ tabs: ['Alt Shot'] })
    await flushPromises()
    expect(w.text()).toContain('0:Alt Shot')
  })
})
