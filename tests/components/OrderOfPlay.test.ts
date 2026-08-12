import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import OrderOfPlay from '@/components/tournament/OrderOfPlay.vue'
import type { MatchResult, TournamentTeam } from '@/api/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } }],
})

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: null, points: 0 },
  { id: 't-red', color: 'Red', captain: null, points: 0 },
]

function match(o: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Fourball',
    finished: false,
    winner_team_id: null,
    leader_team_id: null,
    lead: 0,
    holes_remaining: 18,
    sides: [
      { team_id: 't-blue', players: [{ player_id: 'b1', first_name: 'Bo', last_name: 'Jones' }] },
      { team_id: 't-red', players: [{ player_id: 'r1', first_name: 'Amy', last_name: 'Smith' }] },
    ],
    hole_results: [],
    tee_time: '2026-08-01T14:00:00Z',
    scoring_opens_at: '2026-08-01T12:00:00Z',
    scoring_closes_at: '2026-08-02T02:00:00Z',
    course_name: 'Test GC',
    ...o,
  }
}

function render(m: MatchResult) {
  return mount(OrderOfPlay, {
    props: { matches: [m], teams, tournamentId: 't1' },
    global: { plugins: [router] },
  })
}

describe('OrderOfPlay live status', () => {
  // The leader and the margin both come from the server, so the row never has to count
  // hole_results to work out who is ahead.
  it('shows the leader and margin of a match in progress', () => {
    const w = render(match({ leader_team_id: 't-red', lead: 2, hole_results: ['t-red', null, 't-red', null, null] }))
    expect(w.text()).toContain('2↑')
    expect(w.text()).toContain('thru 5')
  })

  it('shows AS when nobody is ahead', () => {
    const w = render(match({ leader_team_id: null, lead: 0, hole_results: ['t-red', 't-blue'] }))
    expect(w.text()).toContain('AS')
    expect(w.text()).toContain('thru 2')
  })

  it('shows the finished result instead of a live state', () => {
    const w = render(
      match({
        finished: true,
        winner_team_id: 't-blue',
        leader_team_id: 't-blue',
        lead: 3,
        holes_remaining: 2,
        hole_results: ['t-blue'],
      }),
    )
    expect(w.text()).toContain('3 & 2')
    expect(w.text()).not.toContain('thru')
  })

  it('shows no status before a match starts', () => {
    const w = render(match())
    expect(w.text()).toContain('–')
    expect(w.text()).not.toContain('thru')
  })
})
