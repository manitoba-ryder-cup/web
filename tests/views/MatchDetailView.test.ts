import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { MatchResult } from '@/api/types'
import { utcToEventInput } from '@/lib/teeTime'

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
  tee_time_local: utcToEventInput(teeingOffNow, 'America/Winnipeg'),
  course_name: 'Clear Lake',
}
// A match on the schedule whose lineup hasn't been picked yet.
const noLineup: MatchResult = { ...withLineup, sides: [] }

const match = vi.fn(() => withLineup)
vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentTeams: vi.fn(() => Promise.resolve(teams)),
    getTournamentResults: vi.fn(() => Promise.resolve([match()])),
    getMatchHoles: vi.fn(() => Promise.resolve([])),
    getMatchScores: vi.fn(() => Promise.resolve([])),
  },
}))

import MatchDetailView from '@/views/MatchDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
    { path: '/admin/t/:id/m/:matchId', name: 'admin-lineup', component: { template: '<div/>' } },
  ],
})

async function open({ loggedIn = true } = {}) {
  setActivePinia(createPinia())
  if (loggedIn) useAuthStore().accessToken = 'tok'
  router.push('/t/t1/m/m1')
  await router.isReady()
  const w = mount(MatchDetailView, { props: { tournamentId: 't1', matchId: 'm1' }, global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('MatchDetailView', () => {
  beforeEach(() => match.mockReturnValue(withLineup))

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

  it('does not make holes tappable before the cup is played', async () => {
    // The entry page would only turn them straight back — it refuses to score a match
    // that has not teed off.
    match.mockReturnValue({
      ...withLineup,
      tee_time: teeingOffIn60Days,
      tee_time_local: utcToEventInput(teeingOffIn60Days, 'America/Winnipeg'),
    })

    const w = await open()
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    expect(w.get('tbody tr').classes()).not.toContain('cursor-pointer')
  })

  it('taps a hole through to its scores once the cup is under way', async () => {
    match.mockReturnValue({ ...withLineup, tee_time: teeingOffNow, tee_time_local: utcToEventInput(teeingOffNow, 'America/Winnipeg') })

    const w = await open()
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
  })

  it('keeps a played cup tappable, so its holes can still be read', async () => {
    // Scoring is shut for last year's cup, but every hole of it has something to show.
    match.mockReturnValue({ ...withLineup, tee_time: playedLastYear, tee_time_local: utcToEventInput(playedLastYear, 'America/Winnipeg') })

    const w = await open()
    await w.get('tbody tr').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
  })

  it('never offers it to a logged-out viewer', async () => {
    match.mockReturnValue(noLineup)

    const w = await open({ loggedIn: false })

    expect(w.text()).not.toContain('Set lineup')
  })
})
