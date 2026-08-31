import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

const PAIRING = [
  { team_id: 'blue-1', players: [{ player_id: 'p1', first_name: 'Bo', last_name: 'Jones' }] },
  { team_id: 'red-1', players: [{ player_id: 'p2', first_name: 'Amy', last_name: 'Smith' }] },
]

function match(teeTime: string, format: string, finished = false, drawn = false) {
  return {
    match_id: teeTime + format,
    format_name: format,
    players_per_side: format === 'Singles' ? 1 : 2,
    scores_per_player: true,
    sides: drawn ? PAIRING : [],
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
// The clock every case is read against, and the two tee times sit after it — a schedule the
// cup has not reached. Moving one without the other is what these cases turn on.
const CLOCK = new Date('2026-09-01T12:00:00Z')
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
  // Pinned: what the card shows turns on the tee time, so on a real clock these fixtures stop
  // being ahead of it the week the cup is played.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(CLOCK)
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([TOURNAMENT])
    vi.mocked(scorecardApi.getTournament).mockResolvedValue(TOURNAMENT)
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue(TEAMS)
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // refetch() does not consult `enabled`, so the parts still waiting on an id would each spend
  // a request asking about a tournament called '' — on the tap that most needs to work.
  it('asks only for what it can ask for when the cup lookup is retried', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))
    const wrapper = mountDashboard()
    await flushPromises()
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.listTournaments).toHaveBeenCalled()
    expect(scorecardApi.getTournament).not.toHaveBeenCalled()
    expect(scorecardApi.getTournamentTeams).not.toHaveBeenCalled()
    expect(scorecardApi.getTournamentResults).not.toHaveBeenCalled()
  })

  // The 7xl score on the front page is the teams' points, not the results'. Polled with them or
  // it freezes for the two days the twenty-second cadence exists for.
  it('keeps the standing up to date while the cup is being played', async () => {
    vi.useFakeTimers()
    const live = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    // Open, not merely started: the helper closes the window at the tee time, and a shut one
    // puts the poll on its five-minute heartbeat where 65 seconds shows nothing.
    const open = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([{ ...match(live, 'Fourball'), scoring_closes_at: open }])
    mountDashboard()
    await vi.advanceTimersByTimeAsync(0)
    const before = vi.mocked(scorecardApi.getTournamentTeams).mock.calls.length

    await vi.advanceTimersByTimeAsync(65_000)

    expect(vi.mocked(scorecardApi.getTournamentTeams).mock.calls.length).toBeGreaterThan(before)
    vi.useRealTimers()
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

  // A session with no pairings drawn renders a time and a dash per row, so there is nothing in
  // it worth trading the finished results for.
  it('moves on once the next session has been drawn', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball', true), match(SAT, 'Singles', false, true)])
    const w = mountDashboard()
    await flushPromises()
    expect(w.text()).toContain('Singles')
  })

  it('holds the finished session while the next is undrawn', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball', true), match(SAT, 'Singles')])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Fourball')
    expect(w.text()).not.toContain('Singles')
  })

  // Nothing has been played yet, so an undrawn schedule is still the best thing on offer.
  it('shows the opening session before the cup even undrawn', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball'), match(SAT, 'Singles')])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Fourball')
    expect(w.text()).toContain('Next out')
  })

  // Relative to now for the same reason the countdown case is: the label turns on whether the
  // session has teed off, which a fixed date stops describing.
  const HOUR = 3_600_000

  // Both of these fix the label to the session rather than to the cup, and each would read the
  // other way round if it followed the record's phase instead.
  it('heads the card "On the course" for a session that has teed off', async () => {
    const teedOff = new Date(Date.now() - HOUR).toISOString()
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(teedOff, 'Fourball')])
    const w = mountDashboard()
    await flushPromises()

    // The record still says upcoming; the session is out all the same.
    expect(w.text()).toContain('On the course')
    expect(w.text()).not.toContain('Next out')
  })

  it('heads the card "Just played" between sessions, with the cup still live', async () => {
    const teedOff = new Date(Date.now() - HOUR).toISOString()
    const dueOut = new Date(Date.now() + HOUR).toISOString()
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'live' })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(teedOff, 'Fourball', true), match(dueOut, 'Alt Shot')])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Fourball')
    expect(w.text()).toContain('Just played')
    expect(w.text()).not.toContain('On the course')
  })

  it('heads the card "Next out" once the next session is drawn', async () => {
    const teedOff = new Date(Date.now() - HOUR).toISOString()
    const dueOut = new Date(Date.now() + HOUR).toISOString()
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'live' })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      match(teedOff, 'Fourball', true),
      match(dueOut, 'Alt Shot', false, true),
    ])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Alt Shot')
    expect(w.text()).toContain('Next out')
    expect(w.text()).not.toContain('Just played')
  })

  // The clock is the only thing that moves here: the schedule is static, and the scoring window
  // is parked past the run so the poll stays on its five-minute heartbeat rather than refetching.
  it('crosses into the next session as it tees off, with no change in the data', async () => {
    const teedOff = new Date(Date.now() - HOUR).toISOString()
    const teesOffSoon = new Date(Date.now() + 2 * 60_000).toISOString()
    const parked = new Date(Date.now() + HOUR).toISOString()
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'live' })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      match(teedOff, 'Fourball', true),
      { ...match(teesOffSoon, 'Alt Shot'), scoring_opens_at: parked, scoring_closes_at: parked },
    ])
    const w = mountDashboard()
    await flushPromises()
    expect(w.text()).toContain('Just played')
    expect(w.text()).not.toContain('Alt Shot')
    const fetched = vi.mocked(scorecardApi.getTournamentResults).mock.calls.length

    await vi.advanceTimersByTimeAsync(3 * 60_000)

    expect(vi.mocked(scorecardApi.getTournamentResults).mock.calls.length).toBe(fetched)
    expect(w.text()).toContain('Alt Shot')
    expect(w.text()).toContain('On the course')
  })

  // The card that used to be dropped here was a "Next out" heading over an empty body. What
  // stands in its place is the session that decided the cup, with its results in it.
  it('holds the closing session once every match has finished', async () => {
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'finished' })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(FRI, 'Fourball', true), match(SAT, 'Singles', true)])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Singles')
    expect(w.text()).toContain('Final results')
  })

  // Two ways a finished cup goes wrong on this card. A match nobody entered stays unfinished with
  // its tee time long past, and the front page holds last year's cup until the next one exists.
  it('heads a finished cup with its result, on the day and eleven months later', async () => {
    const teedOff = new Date(Date.now() - HOUR).toISOString()
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({ ...TOURNAMENT, phase: 'finished' })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(teedOff, 'Fourball', true), match(teedOff, 'Singles', false)])
    const w = mountDashboard()
    await flushPromises()

    expect(w.text()).toContain('Final results')
    expect(w.text()).not.toContain('On the course')
    expect(w.text()).not.toContain('Just played')
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

  // Relative to now, not a fixture date: a fixed one in the future stops being one, and this
  // test would then pass by agreeing with the case below it.
  it('counts down to the first tee time while it is still ahead', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match(tomorrow, 'Fourball')])

    const w = mountDashboard()
    await flushPromises()

    const hero = w.get('section').text()
    expect(hero).toContain('Tees off in')
    expect(hero).not.toContain('–')
  })

  // The record turns live on the first score, a hole's play after the first group goes out.
  // Waiting for it left the hero holding a matchup over the gap the countdown had been filling.
  it('shows the standing as soon as the countdown runs out, not once a score lands', async () => {
    // Teed off in the past, and the record still says upcoming because nothing is scored.
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([match('2020-01-01T14:00:00Z', 'Fourball')])

    const w = mountDashboard()
    await flushPromises()

    // The matchup reads "Jones vs Smith"; the standing puts a dash between two point totals.
    const hero = w.get('section').text()
    expect(hero).not.toContain('vs')
    expect(hero).toContain('–')
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
