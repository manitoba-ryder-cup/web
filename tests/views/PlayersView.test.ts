import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { listTournaments: vi.fn(), listPlayers: vi.fn(), getTournamentPlayers: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import PlayersView from '@/views/PlayersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/players', component: { template: '<div/>' } },
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
  const w = mount(PlayersView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

const clickOption = (w: Awaited<ReturnType<typeof loaded>>, label: string) =>
  w
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click')

describe('PlayersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router.push('/players')
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg' },
    ])
    // Bygone plays no cup this year, so which of the two names renders says which scope is
    // showing without leaning on the markup either one happens to use.
    vi.mocked(scorecardApi.listPlayers).mockResolvedValue([
      {
        id: 'p1',
        user_id: null,
        first_name: 'Amy',
        last_name: 'Smith',
        photo_path: '',
        record: { wins: 1, losses: 0, ties: 0 },
        cups_won: 0,
      },
      {
        id: 'p9',
        user_id: null,
        first_name: 'Gus',
        last_name: 'Bygone',
        photo_path: '',
        record: { wins: 0, losses: 2, ties: 0 },
        cups_won: 0,
      },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: { id: 'c1', first_name: 'Bo', last_name: 'Jones' }, points: 0 },
      { id: 'red-1', color: 'Red', captain: { id: 'c2', first_name: 'Cal', last_name: 'Reid' }, points: 0 },
    ])
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([entrant()])
  })

  it('shows the filter and card skeleton while loading', async () => {
    const w = mount(PlayersView, { global: { plugins: [router] } })

    expect(w.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0)
    // The per-scope empty copy describes loaded data.
    expect(w.text()).not.toContain("This year's roster hasn't been set yet.")

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Smith')
  })

  it('opens on this cup', async () => {
    const w = await loaded()

    expect(w.text()).toContain('Smith')
    expect(w.text()).not.toContain('Bygone')
  })

  it('shows this cup by team once the draft is done', async () => {
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([entrant({ team_id: 'blue-1' })])
    const w = await loaded()

    expect(w.text()).toContain('Team Jones')
    expect(w.text()).toContain('Team Reid')
  })

  it('shows this cup as one field until every entrant has a team', async () => {
    const w = await loaded()

    expect(w.text()).not.toContain('Team Jones')
    expect(w.text()).toContain('Smith')
  })

  it('widens to every player who has ever taken part', async () => {
    const w = await loaded()

    await clickOption(w, 'All time')

    expect(w.text()).toContain('Bygone')
  })

  it('opens on the scope the hash names', async () => {
    router.push('/players#all-time')
    await router.isReady()
    const w = await loaded()

    expect(w.text()).toContain('Bygone')
  })
})
