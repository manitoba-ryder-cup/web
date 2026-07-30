import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { listTournaments: vi.fn(), listPlayers: vi.fn(), getTournamentPlayers: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import PlayersView from '@/views/PlayersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/players/:id', name: 'player', component: { template: '<div/>' } }],
})

describe('PlayersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg' },
    ])
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
    ])
    // The roster tab is the active one, so the fixture has to populate it — an empty roster
    // renders the "hasn't been set yet" copy and the player only exists on the other tab.
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([
      {
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
      },
    ])
  })

  it('shows a tab bar and card skeleton while loading', async () => {
    const w = mount(PlayersView, { global: { plugins: [router] } })

    expect(w.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0)
    // The per-tab empty copy describes loaded data.
    expect(w.text()).not.toContain("This year's roster hasn't been set yet.")

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Smith')
  })
})
