import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { getTournamentResults: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import PlayerTournamentRow from '@/components/player/PlayerTournamentRow.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } }],
})

const entry = {
  tournament_id: 't1',
  name: 'Cup 2024',
  location: 'Clear Lake',
  start_date: '2024-08-10',
  end_date: '2024-08-11',
  captain_first_name: 'Cam',
  captain_last_name: 'Macaulay',
  result: 'won' as const,
  record: { wins: 3, losses: 1, ties: 0 },
  tier: 'gold',
  biography: 'Holed out from the car park.',
}

function mountRow(open: boolean) {
  return mount(PlayerTournamentRow, {
    props: { entry, playerId: 'p1', open },
    global: { plugins: [router] },
  })
}

describe('PlayerTournamentRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      {
        match_id: 'm1',
        format_name: 'Singles',
        scores_per_player: true,
        finished: true,
        winner_team_id: 'blue-1',
        leader_team_id: 'blue-1',
        lead: 3,
        holes_remaining: 2,
        tee_time: '2024-08-10T14:00:00Z',
        scoring_opens_at: new Date(new Date('2024-08-10T14:00:00Z').getTime() - 2 * 3600000).toISOString(),
        scoring_closes_at: new Date(new Date('2024-08-10T14:00:00Z').getTime() + 12 * 3600000).toISOString(),
        course_name: 'Clear Lake',
        sides: [
          { team_id: 'blue-1', players: [{ player_id: 'p1', first_name: 'Amy', last_name: 'Smith' }] },
          { team_id: 'red-1', players: [{ player_id: 'p2', first_name: 'Bo', last_name: 'Jones' }] },
        ],
        hole_results: [],
      },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
  })

  it('shows a skeleton while the matches load, not a "no matches" claim', async () => {
    // This row loads its matches on first open rather than with the list, so it owns a
    // second loading state the page's skeleton never covers.
    const w = mountRow(false)
    await w.setProps({ open: true })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No matches recorded for this cup.')
    // The blocks are aria-hidden, so the row announces the load itself.
    expect(w.get('.sr-only').text()).toBe('Loading matches…')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Singles')
  })

  it('says so when a cup genuinely has no matches', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([])
    const w = mountRow(false)
    await w.setProps({ open: true })
    await flushPromises()

    expect(w.text()).toContain('No matches recorded for this cup.')
  })
})
