import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    listTournaments: vi.fn(),
    getTournamentTeams: vi.fn(),
    getTournamentResults: vi.fn(),
    getTournamentPlayers: vi.fn(),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import DashboardView from '@/views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/tournaments/:tournamentId/matches/:matchId', name: 'match', component: { template: '<div/>' } },
  ],
})

const TOURNAMENT = { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg' }
const TEAMS = [
  { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones' }, points: 0 },
  { id: 'red-1', color: 'Red', captain: { id: 'p1', first_name: 'Amy', last_name: 'Smith' }, points: 0 },
]

function mountDashboard() {
  return mount(DashboardView, { global: { plugins: [router] } })
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([TOURNAMENT])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue(TEAMS)
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([])
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([])
  })

  it('shows skeletons instead of claiming teams are unannounced while loading', async () => {
    const wrapper = mountDashboard()

    // The regression: an unloaded page is indistinguishable from an un-drafted one, so
    // the phase notice used to render against empty data and state this as fact.
    expect(wrapper.text()).not.toContain('to be announced')
    expect(wrapper.find('[data-testid="hero-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="body-skeleton"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.find('[data-testid="hero-skeleton"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="body-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('to be announced')
  })

  it('offers a retry instead of a phase notice when the load fails', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.text()).toContain('offline')
    expect(wrapper.text()).not.toContain('to be announced')
    // The hero has no tournament to describe, so it falls back to the site name.
    expect(wrapper.text()).toContain('Manitoba Ryder Cup')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('offline')
    // Loaded: the hero swaps the site name for the captain matchup.
    expect(wrapper.text()).toContain('Jones')
    expect(wrapper.text()).toContain('Smith')
  })
})
