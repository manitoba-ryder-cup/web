import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { MatchResult } from '@/api/types'

const teams = [
  { id: 'blue', color: 'Blue', captain: null, points: 0 },
  { id: 'red', color: 'Red', captain: null, points: 0 },
]
// The scoring window runs from 2h before the tee time to 12h after, so a match's own tee
// time is what puts it in the future, under way, or long over.
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString()
const teeingOffNow = hoursFromNow(0)
const teeingOffIn60Days = hoursFromNow(24 * 60)
const playedLastYear = hoursFromNow(-24 * 365)

// The API sends the window alongside the tee time, so a fixture that moves a match in
// time has to move its window too — setting tee_time alone would leave the gate behind.
const withWindow = <T extends { tee_time: string }>(m: T, teeTime: string): T => ({
  ...m,
  tee_time: teeTime,
  scoring_opens_at: new Date(new Date(teeTime).getTime() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(new Date(teeTime).getTime() + 12 * 3600000).toISOString(),
})

const withLineup: MatchResult = {
  match_id: 'm1',
  format_name: 'Singles',
  finished: false,
  winner_team_id: null,
  leader_team_id: null,
  lead: 0,
  holes_remaining: 18,
  sides: [
    { team_id: 'blue', players: [{ player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' }] },
    { team_id: 'red', players: [{ player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' }] },
  ],
  hole_results: [],
  tee_time: teeingOffNow,
  scoring_opens_at: new Date(new Date(teeingOffNow).getTime() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(new Date(teeingOffNow).getTime() + 12 * 3600000).toISOString(),
  course_name: 'Clear Lake',
}
// A match on the schedule whose lineup hasn't been picked yet.
const noLineup: MatchResult = { ...withLineup, sides: [] }

const match = vi.fn(() => withLineup)
// The whole tournament, which is what the ScoreBar on this page renders. Defaults to the
// one match the other tests care about.
const cup = vi.fn((): MatchResult[] => [match()])
vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentTeams: vi.fn(() => Promise.resolve(teams)),
    getTournamentResults: vi.fn(() => Promise.resolve(cup())),
    getMatchHoles: vi.fn(() => Promise.resolve([])),
    getMatchScores: vi.fn(() => Promise.resolve([])),
  },
}))

import { scorecardApi } from '@/api/scorecard'
import MatchDetailView from '@/views/MatchDetailView.vue'
import { tokenWithScopes } from '../support/token'
import { SCOPE_TOURNAMENTS_WRITE, SCOPE_SCORES_WRITE } from '@/api/scopes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
    { path: '/admin/t/:id/m/:matchId', name: 'admin-lineup', component: { template: '<div/>' } },
  ],
})

async function open({ loggedIn = true, scopes = [SCOPE_TOURNAMENTS_WRITE] } = {}) {
  setActivePinia(createPinia())
  if (loggedIn) useAuthStore().accessToken = tokenWithScopes(scopes)
  router.push('/t/t1/m/m1')
  await router.isReady()
  const w = mount(MatchDetailView, { props: { tournamentId: 't1', matchId: 'm1' }, global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('MatchDetailView', () => {
  // Reset here rather than at the end of the test that changes it: any expect above can
  // throw first, and a scored hole would then leak into every test after it.
  beforeEach(() => {
    vi.mocked(scorecardApi.getMatchScores).mockResolvedValue([])
  })

  beforeEach(() => match.mockReturnValue(withLineup))

  it('reserves the standings bar and scorecard while loading', async () => {
    // Deliberately not the `open()` helper: it flushes, and this asserts pre-flush.
    setActivePinia(createPinia())
    router.push('/t/t1/m/m1')
    await router.isReady()
    const w = mount(MatchDetailView, { props: { tournamentId: 't1', matchId: 'm1' }, global: { plugins: [router] } })

    expect(w.find('[data-testid="scorebar-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    // "Match not found." is a conclusion about loaded data.
    expect(w.text()).not.toContain('Match not found.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
  })

  it('does not offer to set a lineup that is already set', async () => {
    // The card is the whole point of the page once the lineup exists; an admin editing it
    // goes via the hole they want, not a link that reads as unfinished setup.
    const w = await open()

    expect(w.text()).not.toContain('Set lineup')
  })

  it('offers to set the lineup when there is not one yet', async () => {
    match.mockReturnValue(noLineup)

    const w = await open()

    expect(w.text()).toContain("lineup for this match hasn't been set")
    expect(w.find('a[href="/admin/t/t1/m/m1"]').exists()).toBe(true)
  })

  // Being signed in is not the test: the lineup page needs tournaments:write, so offering
  // a scorer the link would only bounce them back to the dashboard.
  it('withholds the lineup link from a signed-in user who cannot set one', async () => {
    match.mockReturnValue(noLineup)
    setActivePinia(createPinia())
    useAuthStore().accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])

    router.push('/t/t1/m/m1')
    await router.isReady()
    const w = mount(MatchDetailView, { props: { tournamentId: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    expect(w.text()).toContain("lineup for this match hasn't been set")
    expect(w.find('a[href="/admin/t/t1/m/m1"]').exists()).toBe(false)
  })

  it('does not make holes tappable before the cup is played', async () => {
    // Scoped explicitly, or this passes on the scope check alone and would go on passing with
    // the tee time never consulted.
    match.mockReturnValue(withWindow(withLineup, teeingOffIn60Days))

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')
  })

  // The window opens with the clock, not with a refetch, so the rows have to notice on
  // their own — a scorer on the tee otherwise waits for something unrelated to move.
  it('lets the rows open when the window does, without new data arriving', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const opensInAMinute = new Date(Date.now() + 60_000).toISOString()
    match.mockReturnValue({ ...withLineup, scoring_opens_at: opensInAMinute, scoring_closes_at: hoursFromNow(12) })

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')

    await vi.advanceTimersByTimeAsync(91_000)
    await flushPromises()

    expect(w.get('tbody tr').classes()).toContain('cursor-pointer')
    vi.useRealTimers()
  })

  it('taps a hole through to the wheel for someone who can record one', async () => {
    match.mockReturnValue(withWindow(withLineup, teeingOffNow))

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
  })

  // The card carries every score, both sides' players and the stroke index, so a reader
  // sent to the entry page would be leaving the fuller view for a thinner one.
  it('leaves the rows inert for a spectator', async () => {
    match.mockReturnValue(withWindow(withLineup, teeingOffNow))

    const w = await open({ loggedIn: false })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')
  })

  // A typo can be what closed a match out early, so the holes it was played over stay
  // open to a correction while the window is. Only the holes it never reached are shut.
  it('still taps through to a played hole of a decided match', async () => {
    match.mockReturnValue(withWindow({ ...withLineup, finished: true }, teeingOffNow))
    vi.mocked(scorecardApi.getMatchScores).mockResolvedValue([
      { hole_number: 1, team_scores: [], leader_team_id: null, lead: 0, holes_remaining: 17, decided: false },
    ])

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
  })

  // Being signed in is not the test either: scoring shut is scoring shut.
  it('leaves them inert once the cup is played, signed in or not', async () => {
    match.mockReturnValue(withWindow(withLineup, playedLastYear))

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')
  })

  it('never offers it to a logged-out viewer', async () => {
    match.mockReturnValue(noLineup)

    const w = await open({ loggedIn: false })

    expect(w.text()).not.toContain('Set lineup')
  })
})

// The page pins the event standing, so what it polls for is the cup rather than this match.
describe('MatchDetailView polling', () => {
  const other = { ...withLineup, match_id: 'm2' }
  afterEach(() => {
    vi.useRealTimers()
    cup.mockImplementation(() => [match()])
  })

  it('keeps the pinned standing moving while the cup is being played', async () => {
    // This pairing tees off in the afternoon; the session on the course now is another's.
    const mine = withWindow(withLineup, hoursFromNow(4))
    match.mockReturnValue(mine)
    cup.mockImplementation(() => [mine, withWindow(other, hoursFromNow(-1))])
    vi.useFakeTimers({ shouldAdvanceTime: true })

    await open({ scopes: [SCOPE_SCORES_WRITE] })
    const first = vi.mocked(scorecardApi.getTournamentResults).mock.calls.length
    await vi.advanceTimersByTimeAsync(65_000)

    // Gated on this match's own window it would sit still, showing a standing being decided
    // three fairways away.
    expect(vi.mocked(scorecardApi.getTournamentResults).mock.calls.length).toBeGreaterThan(first)
  })
})
