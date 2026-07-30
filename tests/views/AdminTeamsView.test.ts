import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { getTournamentPlayers: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AdminTeamsView from '@/views/admin/AdminTeamsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/admin/:id/teams', name: 'admin-teams', component: { template: '<div/>' } }],
})

describe('AdminTeamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(AdminTeamsView, { props: { id: 't1' }, global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No players match.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Smith')
  })
})
