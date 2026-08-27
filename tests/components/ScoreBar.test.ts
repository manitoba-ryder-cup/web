import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import type { MatchResult, TournamentTeam } from '@/api/types'

const teams = (bluePoints = 0, redPoints = 0): TournamentTeam[] => [
  { id: 't-blue', color: 'Blue', captain: null, points: bluePoints },
  { id: 't-red', color: 'Red', captain: null, points: redPoints },
]

function match(o: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Fourball',
    players_per_side: 2,
    scores_per_player: true,
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
    tee_time: '2026-09-18T13:00:00Z',
    scoring_opens_at: '2026-09-18T11:00:00Z',
    scoring_closes_at: '2026-09-19T01:00:00Z',
    course_name: 'Test GC',
    ...o,
  }
}

// The bar's meaning is entirely in how many blocks each shade owns, so read the shades off
// the rendered blocks in order rather than asserting a class appears somewhere.
function bars(results: MatchResult[], teamList = teams()): string[] {
  const w = mount(ScoreBar, { props: { results, teams: teamList } })
  return w.findAll('div.h-20').map((b) => {
    const c = b.classes()
    if (c.includes('bg-mrc-blue-team')) return 'blue'
    if (c.includes('bg-mrc-blue-soft')) return 'blue-soft'
    if (c.includes('bg-mrc-red-team')) return 'red'
    if (c.includes('bg-mrc-red-soft')) return 'red-soft'
    return 'grey'
  })
}

describe('ScoreBar', () => {
  it('projects a half to each side while a started match is all square', () => {
    // Halved is a real outcome worth half a point, not an absence of one — the bar has to
    // show the half each side is on course for.
    expect(bars([match({ hole_results: [null, 't-blue', 't-red'] })])).toEqual(['blue-soft', 'red-soft'])
  })

  it('projects the whole point to the side that leads', () => {
    expect(bars([match({ leader_team_id: 't-red', lead: 2, hole_results: ['t-red', 't-red'] })])).toEqual(['red-soft', 'red-soft'])
  })

  it('projects nothing from a match that has not teed off', () => {
    expect(bars([match()])).toEqual(['grey', 'grey'])
  })

  it('fills decided points solid from each end, projections inside them', () => {
    // Blue won one, red leads the second, the third is level after a hole and the fourth has not
    // started — so a soft half from each end meets in the middle.
    const results = [
      match({ match_id: 'm1', finished: true, winner_team_id: 't-blue', leader_team_id: 't-blue', hole_results: ['t-blue'] }),
      match({ match_id: 'm2', leader_team_id: 't-red', lead: 1, hole_results: ['t-red'] }),
      match({ match_id: 'm3', hole_results: [null] }),
      match({ match_id: 'm4' }),
    ]
    expect(bars(results, teams(1, 0))).toEqual(['blue', 'blue', 'blue-soft', 'grey', 'grey', 'red-soft', 'red-soft', 'red-soft'])
  })
})
