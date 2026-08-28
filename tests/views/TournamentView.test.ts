import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournament: vi.fn().mockResolvedValue({
      id: 't1',
      name: 'Summer Cup',
      start_date: '2026-07-01',
      end_date: '2026-07-03',
      location: 'Winnipeg',
      phase: 'upcoming',
    }),
    getTournamentTeams: vi.fn().mockResolvedValue([
      { id: 'red-1', color: 'Red', captain: { id: 'p1', first_name: 'Amy', last_name: 'Smith' }, points: 8 },
      { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones' }, points: 6 },
    ]),
    getTournamentResults: vi.fn().mockResolvedValue([
      {
        match_id: 'm1',
        format_name: 'Singles',
        players_per_side: 1,
        scores_per_player: true,
        finished: true,
        winner_team_id: 'red-1',
        lead: 3,
        holes_remaining: 2,
        sides: [
          { team_id: 'blue-1', players: [{ player_id: 'b1', first_name: 'Dan', last_name: 'Roy' }] },
          { team_id: 'red-1', players: [{ player_id: 'r1', first_name: 'Cara', last_name: 'Lee' }] },
        ],
        hole_results: ['red-1', null, 'blue-1'],
        tee_time: '2026-09-19T15:00:00Z',
      },
    ]),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { MatchResult } from '@/api/types'
import TournamentView from '@/views/TournamentView.vue'

// The same match the mock above returns, so a window can be put either side of it.
const LIVE_MATCH: MatchResult = {
  match_id: 'm1',
  format_name: 'Singles',
  players_per_side: 1,
  scores_per_player: true,
  finished: true,
  winner_team_id: 'red-1',
  lead: 3,
  holes_remaining: 2,
  sides: [
    { team_id: 'blue-1', players: [{ player_id: 'b1', first_name: 'Dan', last_name: 'Roy' }] },
    { team_id: 'red-1', players: [{ player_id: 'r1', first_name: 'Cara', last_name: 'Lee' }] },
  ],
  hole_results: ['red-1', null, 'blue-1'],
  leader_team_id: 'red-1',
  tee_time: '2026-09-18T13:00:00Z',
  course_name: 'Clear Lake',
  scoring_opens_at: '2026-09-18T11:00:00Z',
  scoring_closes_at: '2026-09-19T01:00:00Z',
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/tournaments/:tournamentId/matches/:matchId', name: 'match', component: { template: '<div/>' } },
  ],
})

describe('TournamentView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('holds the standings bar and hero open while loading', async () => {
    const wrapper = mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })

    // ScoreBar is v-if="teams.length >= 2" and the matchup needs both captains, so both
    // rendered empty on first load and the page jumped twice as data landed.
    expect(wrapper.find('[data-testid="scorebar-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)

    await flushPromises()

    expect(wrapper.find('[data-testid="scorebar-skeleton"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Singles')
  })

  it('renders the hero, standings bar, and match-result tabs', async () => {
    const wrapper = mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()
    const text = wrapper.text()

    // Hero: "{year} · {location}" eyebrow + the captain matchup. On the scores page the
    // captains are white (not team colours) — the ScoreBar right here owns the colour.
    expect(text).toContain('2026 · Winnipeg')
    expect(text).toContain('Jones')
    expect(text).toContain('Smith')
    expect(wrapper.html()).not.toContain('text-mrc-blue-soft')

    // ScoreBar: each team's total points show on the ends.
    expect(text).toContain('8')
    expect(text).toContain('6')

    // Match results: the active format tab renders a match with a player name + margin.
    expect(text).toContain('Singles')
    expect(text).toContain('Lee')
    expect(text).toContain('&') // "3 & 2" margin (big-number split)
  })

  it('omits the hero captains line when a team has no captain', async () => {
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValueOnce([
      { id: 'red-1', color: 'Red', captain: null, points: 3 },
      { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones' }, points: 5 },
    ])
    const wrapper = mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()
    const text = wrapper.text()

    // No matchup ("vs") when a captain is missing; the eyebrow + standings still render.
    expect(text).not.toContain('vs')
    expect(text).toContain('2026 · Winnipeg')
    expect(text).toContain('5')
    expect(text).toContain('3')
  })
})

// Polling is what this page costs the server when nobody is playing. The fixture above
// carries no window at all, which reads as open — these set one either side of now.
describe('TournamentView polling', () => {
  const withWindow = (opensAt: string, closesAt: string) => [{ ...LIVE_MATCH, scoring_opens_at: opensAt, scoring_closes_at: closesAt }]
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString()

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    vi.useRealTimers()
    // mockResolvedValue outlives clearAllMocks, which resets calls and not implementations, so a
    // describe added below would inherit this window-shifted fixture.
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([LIVE_MATCH])
  })

  it('keeps asking while the cup is being played', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue(withWindow(hoursFromNow(-1), hoursFromNow(11)))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(65_000)

    expect(vi.mocked(scorecardApi.getTournamentResults).mock.calls.length).toBeGreaterThan(1)
  })

  // The score bar's decided half is the teams' points, so they have to keep pace with the
  // results — polled apart, the bar sits at whatever the standing was when the page opened.
  it('keeps the teams in step with the results', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue(withWindow(hoursFromNow(-1), hoursFromNow(11)))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(65_000)

    expect(vi.mocked(scorecardApi.getTournamentTeams).mock.calls.length).toBe(
      vi.mocked(scorecardApi.getTournamentResults).mock.calls.length,
    )
    expect(vi.mocked(scorecardApi.getTournamentTeams).mock.calls.length).toBeGreaterThan(1)
  })

  // Nothing in the data changes when a window opens — the windows were always there — so
  // the escalation comes from the clock. A cadence captured at mount would miss it.
  it('speeds up when a window opens under a page nobody has touched', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue(withWindow(hoursFromNow(0.5), hoursFromNow(12)))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(1)

    // Still shut: a minute passes without the twenty-second cadence starting.
    await vi.advanceTimersByTimeAsync(65_000)
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(1)

    // Past the opening, without a reload or a new payload.
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    const atOpen = vi.mocked(scorecardApi.getTournamentResults).mock.calls.length

    await vi.advanceTimersByTimeAsync(65_000)
    expect(vi.mocked(scorecardApi.getTournamentResults).mock.calls.length).toBeGreaterThan(atOpen + 1)
  })

  it('drops to a heartbeat once the last window has shut', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue(withWindow(hoursFromNow(-26), hoursFromNow(-14)))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(TournamentView, { props: { id: 't1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(1)

    // A minute in, where a live cup would have asked twice, last September's has not asked.
    await vi.advanceTimersByTimeAsync(65_000)
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(1)

    // It does not go silent, though: a schedule that has yet to be published reads as not
    // in play, and only a request can turn that empty list into a full one.
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(2)
  })
})
