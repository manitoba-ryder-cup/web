import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournament: vi.fn(),
    getTournamentResults: vi.fn(),
    listMatchFormats: vi.fn(),
    listCourses: vi.fn(),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AdminTournamentView from '@/views/admin/AdminTournamentView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/admin/:id/players', name: 'admin-roster', component: { template: '<div/>' } },
    { path: '/admin/:id/teams', name: 'admin-teams', component: { template: '<div/>' } },
    { path: '/admin/:id/matches/:matchId', name: 'admin-lineup', component: { template: '<div/>' } },
  ],
})

describe('AdminTournamentView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({
      id: 't1',
      name: 'Summer Cup',
      start_date: '2026-07-01',
      end_date: '2026-07-03',
      location: 'Winnipeg',
    })
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
        scoring_opens_at: new Date(new Date('2026-07-01T14:00:00Z').getTime() - 2 * 3600000).toISOString(),
        scoring_closes_at: new Date(new Date('2026-07-01T14:00:00Z').getTime() + 12 * 3600000).toISOString(),
        course_name: 'Elmhurst',
        sides: [],
        hole_results: [],
      },
    ])
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([{ id: 'f1', name: 'Singles' }])
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([{ id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' }])
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(AdminTournamentView, { props: { id: 't1' }, global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No matches have been created for this tournament yet.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Singles')
  })
})
