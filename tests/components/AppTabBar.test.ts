import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import { resetLeaderboardLink } from '@/composables/useLeaderboardLink'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/tournaments', name: 'tournaments', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/tournaments/:tournamentId/matches/:matchId', name: 'match', component: { template: '<div/>' } },
  ],
})

const OLDER = { id: 't1', name: 'Summer Cup', start_date: '2025-07-01', end_date: '2025-07-03', location: 'Winnipeg' }
const LATEST = { id: 't2', name: 'Autumn Cup', start_date: '2026-09-01', end_date: '2026-09-03', location: 'Brandon' }

async function mountBar(path = '/') {
  await router.push(path)
  await router.isReady()
  const w = mount(AppTabBar, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

function hrefFor(w: ReturnType<typeof mount>, label: string) {
  return w
    .findAll('a')
    .find((a) => a.text().includes(label))
    ?.attributes('href')
}

describe('AppTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLeaderboardLink()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([OLDER, LATEST])
  })

  it('offers all four destinations', async () => {
    const w = await mountBar()
    for (const label of ['Home', 'Leaderboard', 'Players', 'History']) {
      expect(w.text()).toContain(label)
    }
  })

  it('points Leaderboard at the most recent tournament', async () => {
    const w = await mountBar()
    expect(hrefFor(w, 'Leaderboard')).toBe('/tournaments/t2')
  })

  // The bar is on every screen, so a failed lookup must not leave a dead tab — the
  // history list is a worse answer than the live leaderboard but still a working one.
  it('falls back to the tournament list when the lookup fails', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))
    const w = await mountBar()
    expect(hrefFor(w, 'Leaderboard')).toBe('/tournaments')
  })

  it('marks the tab matching the current route', async () => {
    const w = await mountBar('/players')
    const players = w.findAll('a').find((a) => a.text().includes('Players'))
    expect(players?.attributes('aria-current')).toBe('page')
    const history = w.findAll('a').find((a) => a.text().includes('History'))
    expect(history?.attributes('aria-current')).toBeUndefined()
  })

  // Home is `/`, which every path is a prefix of. Marking it active everywhere would
  // leave two tabs lit at once on every other screen.
  it('marks Home active only on the dashboard', async () => {
    const w = await mountBar('/players')
    const home = w.findAll('a').find((a) => a.text().includes('Home'))
    expect(home?.attributes('aria-current')).toBeUndefined()
  })

  // Leaderboard resolves to /tournaments/:id, which History (/tournaments) is a prefix
  // of — the same trap as Home, one level down.
  it('marks Leaderboard but not History on a tournament page', async () => {
    const w = await mountBar('/tournaments/t2')
    const leaderboard = w.findAll('a').find((a) => a.text().includes('Leaderboard'))
    const history = w.findAll('a').find((a) => a.text().includes('History'))
    expect(leaderboard?.attributes('aria-current')).toBe('page')
    expect(history?.attributes('aria-current')).toBeUndefined()
  })

  // A match sits under the tournament it belongs to, so the tab you arrived through
  // stays lit rather than the bar going blank as you drill in.
  it('keeps Leaderboard active on a match page', async () => {
    const w = await mountBar('/tournaments/t2/matches/m1')
    const leaderboard = w.findAll('a').find((a) => a.text().includes('Leaderboard'))
    expect(leaderboard?.attributes('aria-current')).toBe('page')
  })

  // Colour is the only other thing marking the current tab, and it is not enough on its
  // own for anyone who cannot see the difference. The pill is present or absent.
  it('marks the active tab with something other than colour', async () => {
    const w = await mountBar('/players')
    const pill = (label: string) =>
      w
        .findAll('a')
        .find((a) => a.text().includes(label))
        ?.find('span.rounded-full')
        .classes()
        .some((c) => c.startsWith('bg-'))
    expect(pill('Players')).toBe(true)
    expect(pill('History')).toBe(false)
  })

  // The desktop header carries its own inline nav; two navs at once is the bug.
  it('is hidden from the desktop breakpoint up', async () => {
    const w = await mountBar()
    expect(w.get('nav').classes()).toContain('md:hidden')
  })
})
