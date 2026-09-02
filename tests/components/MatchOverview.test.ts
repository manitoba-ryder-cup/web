import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchOverview from '@/components/tournament/MatchOverview.vue'
import type { MatchResult, TournamentTeam } from '@/api/types'

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: null, points: 0 },
  { id: 't-red', color: 'Red', captain: null, points: 0 },
]

function match(o: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Fourball',
    players_per_side: 1,
    scores_per_player: true,
    finished: true,
    winner_team_id: 't-blue',
    leader_team_id: 't-blue',
    lead: 2,
    holes_remaining: 1,
    sides: [
      { team_id: 't-blue', players: [{ player_id: 'b1', first_name: 'Bo', last_name: 'Jones' }] },
      { team_id: 't-red', players: [{ player_id: 'r1', first_name: 'Amy', last_name: 'Smith' }] },
    ],
    hole_results: ['t-blue', null, 't-red'],
    tee_time: '2026-09-18T13:00:00Z',
    scoring_opens_at: '2026-09-18T11:00:00Z',
    scoring_closes_at: '2026-09-19T01:00:00Z',
    course_name: 'Test GC',
    ...o,
  }
}

const mountIt = (o: Partial<MatchResult> = {}) => mount(MatchOverview, { props: { match: match(o), teams } })
// Blue renders left and red right, so position identifies the side without reading a team id.
const sides = (w: ReturnType<typeof mountIt>) => w.findAll('.w-2\\/5').map((c) => c.find('.absolute'))
const inks = (w: ReturnType<typeof mountIt>) => w.findAll('.w-2\\/5').map((c) => c.find('.relative').classes())

describe('MatchOverview', () => {
  it('fills the side that won and leaves the other empty', () => {
    const [left, right] = sides(mountIt({ winner_team_id: 't-blue' }))
    expect(left.exists()).toBe(true)
    expect(left.classes()).toContain('bg-mrc-blue-team')
    expect(right.exists()).toBe(false)
    expect(inks(mountIt({ winner_team_id: 't-blue' }))[0]).toContain('text-white')
  })

  // The mirror of the above: one that always filled the left cell would pass the test alone.
  it('fills the right side when red won', () => {
    const [left, right] = sides(mountIt({ winner_team_id: 't-red', leader_team_id: 't-red' }))
    expect(right.exists()).toBe(true)
    expect(right.classes()).toContain('bg-mrc-red-team')
    expect(left.exists()).toBe(false)
  })

  it('points the fill at the result from whichever side won', () => {
    const [blue] = sides(mountIt({ winner_team_id: 't-blue' }))
    const [, red] = sides(mountIt({ winner_team_id: 't-red', leader_team_id: 't-red' }))
    expect(blue.attributes('style')).not.toBe(red.attributes('style'))
  })

  it('fills both sides of a halved match the same, so neither reads as the winner', () => {
    const w = mountIt({ winner_team_id: null, leader_team_id: null, lead: 0, holes_remaining: 0 })
    const [left, right] = sides(w)
    expect(left.classes()).toContain('bg-mrc-line')
    expect(right.classes()).toContain('bg-mrc-line')
    // The two differ only by which edge they sit against; a team colour on either would be a win.
    expect([...left.classes(), ...right.classes()].some((c) => /blue|red/.test(c))).toBe(false)
    // White would land at 1.32:1 on that grey; the ink has to follow the panel it sits on.
    expect(inks(w)).toEqual([expect.arrayContaining(['text-mrc-ink']), expect.arrayContaining(['text-mrc-ink'])])
  })

  // The pair above and below are the distinction: a decided draw is filled, one still going is not.
  it('fills neither side while the match is still being played', () => {
    const live = sides(mountIt({ finished: false, winner_team_id: null, leader_team_id: 't-blue' }))
    expect(live.map((s) => s.exists())).toEqual([false, false])
  })

  it('tells a halved hole from one nobody has played', () => {
    const holes = mountIt().findAll('.rounded-full')
    expect(holes[1].classes()).toContain('bg-mrc-line')
    expect(holes[3].classes().some((c) => c.startsWith('bg-'))).toBe(false)
  })
})
