import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import type { MatchResult, TournamentTeam } from '@/api/types'

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: null, points: 0 },
  { id: 't-red', color: 'Red', captain: null, points: 0 },
]

function match(o: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Singles',
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
    tee_time: null,
    course_name: 'Test GC',
    ...o,
  }
}

const mountIt = (o: Partial<MatchResult> = {}) => mount(MatchSummary, { props: { match: match(o), teams } })

describe('MatchSummary', () => {
  it('reads as the running state while the match is live', () => {
    const w = mountIt({ leader_team_id: 't-red', lead: 3, hole_results: ['t-red'] })
    expect(w.text()).toContain('3 up')
    expect(w.text()).not.toContain('In progress')
  })

  it("fills the leading side and the pill in that side's colour before the match is over", () => {
    const html = mountIt({ leader_team_id: 't-blue', lead: 2, hole_results: ['t-blue'] }).html()
    expect(html).toContain('bg-mrc-blue-team') // leader fills solid, live or not
    expect(html).toContain('text-mrc-blue-team') // pill text follows the leader
    expect(html).toContain('bg-mrc-panel-alt') // the trailing side stays grey
  })

  it("fills the winning side in that side's colour once the match is over", () => {
    const html = mountIt({ finished: true, winner_team_id: 't-red', leader_team_id: 't-red', lead: 3, holes_remaining: 2 }).html()
    expect(html).toContain('bg-mrc-red-team')
    expect(html).toContain('text-mrc-red-team')
  })

  it('stays grey and reads AS when nobody is ahead', () => {
    const w = mountIt()
    expect(w.text()).toContain('AS')
    expect(w.html()).not.toContain('bg-mrc-blue-team')
    expect(w.html()).not.toContain('bg-mrc-red-team')
  })
})
