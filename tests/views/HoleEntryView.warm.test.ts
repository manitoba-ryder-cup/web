import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { MatchResult, TournamentTeam } from '@/api/types'

// Everything resolves before the first render, so nothing the redirect watches ever changes.
// A suite where every mount is cold cannot see it.
const teams: TournamentTeam[] = [
  { id: 'blue', color: 'Blue', captain: null, points: 0 },
  { id: 'red', color: 'Red', captain: null, points: 0 },
]
const teeTime = new Date(Date.now() - 3600000).toISOString()
const match: MatchResult = {
  match_id: 'm1',
  format_name: 'Singles',
  players_per_side: 1,
  scores_per_player: true,
  finished: true, // decided, and hole 16 is one it never reached
  winner_team_id: 'blue',
  leader_team_id: 'blue',
  lead: 4,
  holes_remaining: 3,
  sides: [
    { team_id: 'blue', players: [{ player_id: 'p1', first_name: 'Bo', last_name: 'Jones' }] },
    { team_id: 'red', players: [{ player_id: 'p2', first_name: 'Amy', last_name: 'Smith' }] },
  ],
  hole_results: ['blue'],
  tee_time: teeTime,
  scoring_opens_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(Date.now() + 10 * 3600000).toISOString(),
  course_name: 'Clear Lake',
}

vi.mock('@/composables/useMatchContext', () => ({
  useMatchContext: () => {
    const results = computed(() => [match])
    return {
      error: ref(''),
      loading: ref(false), // already settled, as a cache hit leaves it
      refresh: vi.fn(),
      retry: vi.fn(),
      teams: computed(() => teams),
      results,
      holeStates: computed(() => []),
      holes: computed(() => Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, hdcp: i + 1, yards: 400 }))),
      match: computed(() => match),
      left: computed(() => match.sides[0]),
      right: computed(() => match.sides[1]),
    }
  },
}))

import HoleEntryView from '@/views/HoleEntryView.vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_SCORES_WRITE } from '@/api/scopes'
import { tokenWithScopes } from '../support/token'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
  ],
})

describe('HoleEntryView arriving on a warm cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])
  })

  it('still sends someone away from a hole that cannot be recorded', async () => {
    router.push('/t/t1/m/m1/h/16')
    await router.isReady()
    mount(HoleEntryView, { props: { tournamentId: 't1', matchId: 'm1', hole: '16' }, global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })
})
