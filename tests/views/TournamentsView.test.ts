import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { listTournaments: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import TournamentsView from '@/views/TournamentsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } }],
})

describe('TournamentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg' },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([])
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(TournamentsView, { global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    // The empty text is a claim about loaded data; it must not leak into the load.
    expect(w.text()).not.toContain('No tournaments yet.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    // TournamentCard leads with the year and location, not the tournament's name.
    expect(w.text()).toContain('Winnipeg')
  })
})
