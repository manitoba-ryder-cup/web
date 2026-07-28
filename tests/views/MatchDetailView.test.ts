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
  tee_time: null,
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
    { path: '/t/:id/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:id/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
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

  it('never offers it to a logged-out viewer', async () => {
    match.mockReturnValue(noLineup)

    const w = await open({ loggedIn: false })

    expect(w.text()).not.toContain('Set lineup')
  })
})
