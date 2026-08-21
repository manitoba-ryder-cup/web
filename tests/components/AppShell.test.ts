import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn().mockResolvedValue([]) } }))

import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/hole', name: 'hole', component: { template: '<div/>' }, meta: { hidesNav: true } },
  ],
})

async function mountShell(path: string) {
  await router.push(path)
  await router.isReady()
  return mount(AppShell, { global: { plugins: [router, createPinia()] } })
}

describe('AppShell', () => {
  it('shows the tab bar on an ordinary route', async () => {
    expect((await mountShell('/')).find('nav[aria-label="Primary"]').exists()).toBe(true)
  })

  // Score entry is a full-height control; a fixed bar would sit under the thumb using it.
  it('hides the tab bar where the route asks it to', async () => {
    expect((await mountShell('/hole')).find('nav[aria-label="Primary"]').exists()).toBe(false)
  })

  // The bar is fixed, so without this the last of a page sits underneath it. The padding
  // has to clear the bar's real height — `pb-16` did not, because this app's rem is 14px
  // below md and 4rem came out at 56px against a 71px bar.
  it('keeps the end of a page clear of the bar', async () => {
    const main = (await mountShell('/')).get('main')
    expect(main.classes()).toContain('pb-24')
    expect(main.classes()).toContain('md:pb-0')
  })

  it('adds no padding where there is no bar', async () => {
    expect((await mountShell('/hole')).get('main').classes()).not.toContain('pb-24')
  })
})
