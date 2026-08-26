import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    listTournaments: vi.fn(),
    getTournament: vi.fn(),
    getTournamentTeams: vi.fn(),
    getTournamentResults: vi.fn(),
  },
}))

import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import DashboardView from '@/views/DashboardView.vue'
import type { Tournament } from '@/api/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/tournaments/:tournamentId/matches/:matchId', name: 'match', component: { template: '<div/>' } },
  ],
})

function match(teeTime: string, format: string, finished = false) {
  return {
    match_id: teeTime + format,
    format_name: format,
    scores_per_player: true,
    sides: [],
    hole_results: [],
    finished,
    winner_team_id: null,
    leader_team_id: null,
    lead: 0,
    holes_remaining: 18,
    tee_time: teeTime,
    course_name: 'Buffalo Point',
    scoring_opens_at: teeTime,
    scoring_closes_at: teeTime,
  }
}
const FRI = '2026-09-18T14:00:00Z'
const SAT = '2026-09-19T14:00:00Z'

const TOURNAMENT: Tournament = {
  id: 't1',
  name: 'Summer Cup',
  start_date: '2026-07-01',
  end_date: '2026-07-03',
  location: 'Winnipeg',
  phase: 'upcoming',
}
const TEAMS = [
  { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones' }, points: 0 },
  { id: 'red-1', color: 'Red', captain: { id: 'p1', first_name: 'Amy', last_name: 'Smith' }, points: 0 },
]

function mountDashboard() {
  return mount(DashboardView, { global: { plugins: [router] } })
}

describe('DashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([TOURNAMENT])
    vi.mocked(scorecardApi.getTournament).mockResolvedValue(TOURNAMENT)
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue(TEAMS)
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([])
  })

  // The identity is fixed for the session, so the record is re-read by id — from the store, a
  // tab open through an edit shows the phase the old start date implied.
  it('reads the cup record itself rather than the one the session resolved with', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([{ ...TOURNAMENT, location: 'Stale City' }])
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, location: 'Current City' })

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.text()).toContain('Current City')
    expect(wrapper.text()).not.toContain('Stale City')
  })

  it('shows skeletons rather than a session card while loading', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball')])
    const wrapper = mountDashboard()

    // An unloaded page looks exactly like a cup with nothing left to play. Matched case-
    // insensitively so the guard survives the copy being reworded.
    expect(wrapper.text()).not.toMatch(/next out/i)
    expect(wrapper.find('[data-testid="hero-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="body-skeleton"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.find('[data-testid="hero-skeleton"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="body-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).toMatch(/next out/i)
  })

  it('offers a retry instead of a phase notice when the load fails', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.text()).toContain('offline')
    expect(wrapper.text()).not.toMatch(/next out/i)
    // The hero has no tournament to describe, so it falls back to the site name.
    expect(wrapper.text()).toContain('Manitoba Ryder Cup')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('offline')
    // Loaded: the hero swaps the site name for the captain matchup.
    expect(wrapper.text()).toContain('Jones')
    expect(wrapper.text()).toContain('Smith')
  })

  // The whole point of the landing page: the session in play, not the entire order of
  // play. Before the event most of the schedule is rows with a time and no lineup.
  it('shows only the session being played, not the whole schedule', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball'), match(SAT, 'Singles')])
    const w = mountDashboard()
    await flushPromises()
    expect(w.text()).toContain('Fourball')
    expect(w.text()).not.toContain('Singles')
  })

  it('moves on to the next session once one has finished', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball', true), match(SAT, 'Singles')])
    const w = mountDashboard()
    await flushPromises()
    expect(w.text()).toContain('Singles')
  })

  // Nothing is next once the cup is over, and a card headed "Next out" with an empty body
  // is worse than no card.
  it('drops the session card when every match has finished', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball', true), match(SAT, 'Singles', true)])
    const w = mountDashboard()
    await flushPromises()
    expect(w.text()).not.toContain('Next out')
    expect(w.text()).not.toContain('On the course')
  })

  it('leads with the standing once the cup is under way', async () => {
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'live' })
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { ...TEAMS[0], points: 6.5 },
      { ...TEAMS[1], points: 3.5 },
    ])
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([{ ...match(FRI, 'Fourball'), hole_results: ['blue-1'] }])
    const w = mountDashboard()
    await flushPromises()

    const hero = w.get('section')
    expect(hero.text()).toContain('Jones')
    expect(hero.text()).toContain('6½')
    expect(hero.text()).toContain('3½')
  })

  // Asserts the points, not the absence of a countdown: `useCountdown` returns null for a past
  // target, so once the fixture date passes that stops telling the two heroes apart.
  it('takes the phase from the record rather than re-deriving it from the results', async () => {
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'live' })
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { ...TEAMS[0], points: 6.5 },
      { ...TEAMS[1], points: 3.5 },
    ])
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball')])
    const w = mountDashboard()
    await flushPromises()

    expect(w.get('section').text()).toContain('6½')
  })

  // The tab bar reaches the same page, so the hero does not need to.
  it('sends nobody from the hero to a page the tab bar already reaches', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([{ ...match(FRI, 'Fourball'), hole_results: ['blue-1'] }])
    const w = mountDashboard()
    await flushPromises()

    const hero = w.get('section')
    expect(hero.findAll('a').map((a) => a.attributes('href'))).not.toContain('/tournaments/t1')
  })
})
