import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { getTournamentResults: vi.fn(), getTournamentTeams: vi.fn(), getTournamentPlayers: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AdminMatchLineupView from '@/views/admin/AdminMatchLineupView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/admin/:id', name: 'admin-tournament', component: { template: '<div/>' } }],
})

describe('AdminMatchLineupView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      {
        match_id: 'm1',
        format_name: 'Singles',
        finished: false,
        winner_team_id: null,
        leader_team_id: null,
        lead: 0,
        holes_remaining: 18,
        tee_time: '2026-07-01T14:00:00Z',
        course_name: 'Elmhurst',
        sides: [],
        hole_results: [],
      },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([])
  })

  it('shows a skeleton while loading, not "Match not found."', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })

    // The view resolves the match by scanning a list that is empty until the fetch lands,
    // so its not-found branch is the default state rather than a real conclusion.
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Match not found.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Singles')
  })
})
