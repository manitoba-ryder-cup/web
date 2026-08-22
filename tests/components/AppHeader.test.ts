import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AppHeader from '@/components/layout/AppHeader.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/teams', name: 'teams', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
    { path: '/tournaments', name: 'tournaments', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/login', name: 'login', component: { template: '<div/>' } },
    {
      path: '/deep',
      name: 'deep',
      component: { template: '<div/>' },
      meta: { back: () => ({ to: { name: 'teams' }, label: 'Teams' }) },
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

const currentFor = (w: ReturnType<typeof mount>, label: string) =>
  w
    .findAll('a')
    .find((a) => a.text() === label)
    ?.attributes('aria-current')

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Old', start_date: '2025-07-01', end_date: '2025-07-03', location: 'Winnipeg', phase: 'upcoming' },
      { id: 't2', name: 'New', start_date: '2026-09-01', end_date: '2026-09-03', location: 'Brandon', phase: 'upcoming' },
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
    expect(w.text()).toContain('Teams')
    expect(w.text()).not.toContain('Manitoba Ryder Cup')
  })

  // Without Home in the nav a detail page has no link to the dashboard at all: the wordmark is
  // the way home elsewhere, and a route with a back link replaces it.
  it('offers Home in the desktop nav where the wordmark has been replaced', async () => {
    const w = await mountHeader('/deep')

    expect(w.find('img[alt="MRC logo"]').exists()).toBe(false)
    expect(w.findAll('nav a').map((a) => a.attributes('href'))).toContain('/')
  })

  it.each(['Home', 'Scores', 'Teams', 'History'])('offers %s in the desktop nav', async (label) => {
    expect((await mountHeader()).text()).toContain(label)
  })

  it('marks the section the current screen belongs to', async () => {
    const w = await mountHeader('/teams')
    expect(currentFor(w, 'Teams')).toBe('page')
    expect(currentFor(w, 'History')).toBeUndefined()
  })

  // No nav link is a prefix of a profile, so the marking is the header's own to compute — and
  // it has to land on the section the bottom bar lights.
  it('keeps the list a profile was opened from marked', async () => {
    const fromTeams = await mountHeader('/players/p1')
    expect(currentFor(fromTeams, 'Teams')).toBe('page')

    const fromHistory = await mountHeader('/players/p1?from=history')
    expect(currentFor(fromHistory, 'History')).toBe('page')
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
