import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import { resetScoresLink } from '@/composables/useScoresLink'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/teams', name: 'teams', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
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

const tab = (w: ReturnType<typeof mount>, label: string) => w.findAll('a').find((a) => a.text().includes(label))
const hrefFor = (w: ReturnType<typeof mount>, label: string) => tab(w, label)?.attributes('href')
const currentFor = (w: ReturnType<typeof mount>, label: string) => tab(w, label)?.attributes('aria-current')

describe('AppTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetScoresLink()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([OLDER, LATEST])
  })

  it('offers all four destinations', async () => {
    const w = await mountBar()
    for (const label of ['Home', 'Scores', 'Teams', 'History']) {
      expect(w.text()).toContain(label)
    }
  })

  it('points Scores at the most recent tournament', async () => {
    const w = await mountBar()
    expect(hrefFor(w, 'Scores')).toBe('/tournaments/t2')
  })

  // The bar is on every screen, so a failed lookup must not leave a dead tab — the
  // history list is a worse answer than the live scores but still a working one.
  it('falls back to the tournament list when the lookup fails', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))
    const w = await mountBar()
    expect(hrefFor(w, 'Scores')).toBe('/tournaments')
  })

  it('marks the tab matching the current route', async () => {
    const w = await mountBar('/teams')
    expect(currentFor(w, 'Teams')).toBe('page')
    expect(currentFor(w, 'History')).toBeUndefined()
  })

  // A profile is reached from two lists, and the bar has to agree with the back link the
  // header offers on the same screen — otherwise one says Teams while the other says
  // History and neither is wrong on its own.
  it('keeps the tab a profile was opened from lit', async () => {
    const fromTeams = await mountBar('/players/p1')
    expect(currentFor(fromTeams, 'Teams')).toBe('page')

    const fromHistory = await mountBar('/players/p1?from=history')
    expect(currentFor(fromHistory, 'History')).toBe('page')
    expect(currentFor(fromHistory, 'Teams')).toBeUndefined()
  })

  // Home is `/`, which every path is a prefix of. Marking it active everywhere would
  // leave two tabs lit at once on every other screen.
  it('marks Home active only on the dashboard', async () => {
    const w = await mountBar('/teams')
    expect(currentFor(w, 'Home')).toBeUndefined()
  })

  // Scores resolves to /tournaments/:id, which History (/tournaments) is a prefix
  // of — the same trap as Home, one level down.
  it('marks Scores but not History on a tournament page', async () => {
    const w = await mountBar('/tournaments/t2')
    expect(currentFor(w, 'Scores')).toBe('page')
    expect(currentFor(w, 'History')).toBeUndefined()
  })

  // A match sits under the tournament it belongs to, so the tab you arrived through
  // stays lit rather than the bar going blank as you drill in.
  it('keeps Scores active on a match page', async () => {
    const w = await mountBar('/tournaments/t2/matches/m1')
    expect(currentFor(w, 'Scores')).toBe('page')
  })

  // Colour is the only other thing marking the current tab, and it is not enough on its
  // own for anyone who cannot see the difference. The pill is present or absent.
  it('marks the active tab with something other than colour', async () => {
    const w = await mountBar('/teams')
    const pill = (label: string) =>
      w
        .findAll('a')
        .find((a) => a.text().includes(label))
        ?.find('span.rounded-full')
        .classes()
        .some((c) => c.startsWith('bg-'))
    expect(pill('Teams')).toBe(true)
    expect(pill('History')).toBe(false)
  })

  // The desktop header carries its own inline nav; two navs at once is the bug.
  it('is hidden from the desktop breakpoint up', async () => {
    const w = await mountBar()
    expect(w.get('nav').classes()).toContain('md:hidden')
  })
})
