import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AppHeader from '@/components/layout/AppHeader.vue'
import { resetScoresLink } from '@/composables/useScoresLink'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/tournaments', name: 'tournaments', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/login', name: 'login', component: { template: '<div/>' } },
    {
      path: '/deep',
      name: 'deep',
      component: { template: '<div/>' },
      meta: { back: () => ({ to: { name: 'players' }, label: 'Players' }) },
    },
  ],
})

async function mountHeader(path = '/') {
  await router.push(path)
  await router.isReady()
  const w = mount(AppHeader, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return w
}

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    resetScoresLink()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Old', start_date: '2025-07-01', end_date: '2025-07-03', location: 'Winnipeg' },
      { id: 't2', name: 'New', start_date: '2026-09-01', end_date: '2026-09-03', location: 'Brandon' },
    ])
  })

  it('shows the wordmark on a route with no back link', async () => {
    const w = await mountHeader('/')
    expect(w.text()).toContain('Manitoba Ryder Cup')
  })

  // The back link is the header's own job — the tab bar has no notion of where you came
  // from — and it replaces the wordmark rather than sitting beside it.
  it('replaces the wordmark with the back link the route declares', async () => {
    const w = await mountHeader('/deep')
    expect(w.text()).toContain('Players')
    expect(w.text()).not.toContain('Manitoba Ryder Cup')
  })

  // Only shown from md up, where the tab bar is hidden. If these two ever disagree the app
  // has two different answers for where it goes.
  it.each(['Scores', 'Players', 'History'])('offers %s in the desktop nav', async (label) => {
    expect((await mountHeader()).text()).toContain(label)
  })

  it('points Scores at the most recent tournament', async () => {
    const w = await mountHeader()
    const link = w.findAll('a').find((a) => a.text().includes('Scores'))
    expect(link?.attributes('href')).toBe('/tournaments/t2')
  })

  // Account state lives in AccountMenu, which is tested on its own; the header only has to
  // render it.
  it('carries the account menu', async () => {
    const w = await mountHeader()
    expect(w.findComponent({ name: 'AccountMenu' }).exists()).toBe(true)
  })
})
