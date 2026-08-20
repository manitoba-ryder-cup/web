import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import BaseSegmented from '@/components/base/BaseSegmented.vue'

function makeRouter() {
  return createRouter({ history: createWebHistory(), routes: [{ path: '/players', component: { template: '<div/>' } }] })
}

async function mountAt(hash: string, props: Record<string, unknown> = {}) {
  const router = makeRouter()
  router.push(`/players${hash}`)
  await router.isReady()
  const w = mount(BaseSegmented, {
    props: { options: ['This cup', 'All time'], label: 'Which players', ...props },
    slots: { default: '<p>panel {{ params.index }}</p>' },
    global: { plugins: [router] },
  })
  return { w, router }
}

describe('BaseSegmented', () => {
  it('renders one button per option and marks the active one pressed', async () => {
    const { w } = await mountAt('')
    const buttons = w.findAll('button')

    expect(buttons.map((b) => b.text())).toEqual(['This cup', 'All time'])
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false'])
  })

  it('labels the group so the buttons are announced as one control', async () => {
    const { w } = await mountAt('')
    expect(w.get('[role="group"]').attributes('aria-label')).toBe('Which players')
  })

  it('exposes the active index to the panel and swaps it on click', async () => {
    const { w } = await mountAt('')
    expect(w.text()).toContain('panel 0')

    await w.findAll('button')[1].trigger('click')

    expect(w.text()).toContain('panel 1')
    expect(w.findAll('button').map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true'])
  })

  it('opens on the option the hash names', async () => {
    const { w } = await mountAt('#all-time')
    expect(w.text()).toContain('panel 1')
  })

  it('writes the active option back to the hash', async () => {
    const { w, router } = await mountAt('')

    await w.findAll('button')[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#all-time')
  })

  it('leaves the hash alone when syncHash is off', async () => {
    const { w, router } = await mountAt('#all-time', { syncHash: false })
    expect(w.text()).toContain('panel 0')

    await w.findAll('button')[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#all-time')
  })

  it('gives every option a 44px tap target', async () => {
    const { w } = await mountAt('')
    // Sized in px, not rem: the root font-size is 14px on mobile, so a rem-based min-height
    // named 44 would render 38.5 on exactly the screens the minimum is for.
    expect(w.findAll('button').every((b) => b.classes('min-h-[44px]'))).toBe(true)
  })

  it('marks the active option with a fill, not colour alone', async () => {
    const { w } = await mountAt('')
    const [active, inactive] = w.findAll('button')

    expect(active.classes()).toContain('bg-mrc-accent')
    expect(inactive.classes('bg-mrc-accent')).toBe(false)
  })
})
