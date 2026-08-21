import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// No listPlayers: the archive moved to the history page, and leaving it off the mock means
// a view that reached for it again would fail here rather than quietly widen the page.
vi.mock('@/api/scorecard', () => ({
  scorecardApi: { listTournaments: vi.fn(), getTournamentPlayers: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import TeamsView from '@/views/TeamsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/teams', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
  ],
})

function entrant(o: Partial<TournamentPlayer> = {}): TournamentPlayer {
  return {
    tournament_id: 't1',
    player_id: 'p1',
    tier: 'gold',
    biography: '',
    hdcp: 4,
    first_name: 'Amy',
    last_name: 'Smith',
    photo_path: '',
    team_id: null,
    record: { wins: 1, losses: 0, ties: 0 },
    cups_won: 0,
    ...o,
  }
}

async function loaded() {
  const w = mount(TeamsView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('TeamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router.push('/teams')
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg' },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: { id: 'c1', first_name: 'Bo', last_name: 'Jones' }, points: 0 },
      { id: 'red-1', color: 'Red', captain: { id: 'c2', first_name: 'Cal', last_name: 'Reid' }, points: 0 },
    ])
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([entrant()])
  })

  it('shows a team-sheet skeleton while loading', async () => {
    const w = mount(TeamsView, { global: { plugins: [router] } })

    expect(w.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0)
    // The empty copy describes loaded data.
    expect(w.text()).not.toContain("This year's teams haven't been picked yet.")

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Smith')
  })

  // The page is otherwise undated, and the same address shows a different roster each year.
  it('names the cup these teams belong to', async () => {
    const w = await loaded()

    expect(w.text()).toContain('2026 · Winnipeg')
  })

  // The same heading the dashboard and the scores page lead with, so the three pages about
  // this cup open the same way.
  it('heads the page with the matchup', async () => {
    const w = await loaded()

    expect(w.text()).toContain('Jones')
    expect(w.text()).toContain('Reid')
  })

  // White, not team colour: the sheet right below heads each column in blue and red, and
  // the hero saying it again in the same two colours is one statement wearing two coats.
  it('leaves the colour to the sheet below', async () => {
    const w = await loaded()

    const names = w.findAll('.h-36 span').filter((n) => /Jones|Reid/.test(n.text()))
    expect(names).toHaveLength(2)
    expect(names.every((n) => n.classes().includes('text-white'))).toBe(true)
  })

  it('falls back to the page name before the captains are known', async () => {
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
    const w = await loaded()

    expect(w.get('h1').text()).toBe('Teams')
  })

  it('shows the field by team once the draft is done', async () => {
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([entrant({ team_id: 'blue-1' })])
    const w = await loaded()

    expect(w.text()).toContain('Team Jones')
    expect(w.text()).toContain('Team Reid')
  })

  it('shows one field until every entrant has a team', async () => {
    const w = await loaded()

    expect(w.text()).not.toContain('Team Jones')
    expect(w.text()).toContain('Smith')
  })

  it('says so when this year has no teams yet', async () => {
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([])
    const w = await loaded()

    expect(w.text()).toContain("This year's teams haven't been picked yet.")
  })
})
