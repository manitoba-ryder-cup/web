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

// A fourball is the only format that records a score per player, so it is the only one
// with anything behind a hole row.
const fourball: MatchResult = {
  ...withLineup,
  format_name: 'Fourball',
  sides: [
    {
      team_id: 'blue',
      players: [
        { player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' },
        { player_id: 'p3', first_name: 'Keith', last_name: 'Van Walleghem' },
      ],
    },
    {
      team_id: 'red',
      players: [
        { player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' },
        { player_id: 'p4', first_name: 'Connor', last_name: 'Macaulay' },
      ],
    },
  ],
}
const fourballHole = {
  hole_number: 1,
  team_scores: [
    {
      team_id: 'blue',
      strokes: 4,
      player_scores: [
        { player_id: 'p1', strokes: 4 },
        { player_id: 'p3', strokes: 6 },
      ],
    },
    {
      team_id: 'red',
      strokes: 5,
      player_scores: [
        { player_id: 'p2', strokes: 5 },
        { player_id: 'p4', strokes: 5 },
      ],
    },
  ],
  leader_team_id: 'blue',
  lead: 1,
  holes_remaining: 17,
  decided: false,
}

const match = vi.fn(() => withLineup)
const scores = vi.fn((): unknown[] => [])
vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentTeams: vi.fn(() => Promise.resolve(teams)),
    getTournamentResults: vi.fn(() => Promise.resolve([match()])),
    getMatchHoles: vi.fn(() => Promise.resolve([])),
    getMatchScores: vi.fn(() => Promise.resolve(scores())),
  },
}))

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
  beforeEach(() => {
    match.mockReturnValue(withLineup)
    scores.mockReturnValue([])
  })

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
    // The entry page would only turn them straight back — it refuses to score a match
    // that has not teed off.
    match.mockReturnValue(withWindow(withLineup, teeingOffIn60Days))

    const w = await open()
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')
  })

  // The entry page is for recording, so only someone who can record is sent to it.
  it('taps a hole through to its scores for a scorer once the cup is under way', async () => {
    match.mockReturnValue(withWindow(withLineup, teeingOffNow))

    const w = await open({ scopes: [SCOPE_SCORES_WRITE] })
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
  })

  // A reader who cannot score has no business on the entry page, so the hole opens where
  // they are: the scores each player made, under the row they tapped.
  it('opens a hole in place for a reader who cannot score', async () => {
    match.mockReturnValue(withWindow(fourball, playedLastYear))
    scores.mockReturnValue([fourballHole])

    const w = await open()
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.text()).toContain('Keith Van Walleghem')
    expect(w.text()).toContain('Connor Macaulay')
  })

  it('closes the hole it opened when the row is tapped again', async () => {
    match.mockReturnValue(withWindow(fourball, playedLastYear))
    scores.mockReturnValue([fourballHole])
    const w = await open()

    await w.get('tbody tr').trigger('click')
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(w.text()).not.toContain('Keith Van Walleghem')
  })

  // Singles and the one-ball formats record a score a side, which the row already shows —
  // so there is nothing behind the row and it does not invite a tap it cannot answer.
  it('offers nothing to open where a side records one score', async () => {
    match.mockReturnValue(withWindow(withLineup, playedLastYear))
    const w = await open()

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
