import { describe, it, expect } from 'vitest'
import { useMatchSides } from '@/composables/useMatchSides'
import type { MatchResult, TournamentTeam } from '@/api/types'

const redTeam: TournamentTeam = { id: 'a-red', color: 'Red', captain: null, points: 0 }
const blueTeam: TournamentTeam = { id: 'z-blue', color: 'Blue', captain: null, points: 0 }

function match(): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Singles',
    finished: false,
    winner_team_id: null,
    leader_team_id: null,
    lead: 0,
    holes_remaining: 18,
    sides: [
      { team_id: 'a-red', players: [{ player_id: 'p1', first_name: 'R', last_name: 'One' }] },
      { team_id: 'z-blue', players: [{ player_id: 'p2', first_name: 'B', last_name: 'Two' }] },
    ],
    hole_results: [],
    tee_time: '2026-09-18T13:00:00Z',
    tee_time_local: '2026-09-18T08:00', // same instant, Winnipeg's clock (CDT, UTC-5 in September)
    course_name: 'GC',
  }
}

describe('useMatchSides', () => {
  // Teams passed Red-first, and the Red id ('a-red') sorts before the Blue id
  // ('z-blue') — the case that used to land Red on the left.
  it('puts the Blue side on the left and Red on the right', () => {
    const { left, right, colorFor } = useMatchSides(
      () => match(),
      () => [redTeam, blueTeam],
    )
    expect(left.value?.team_id).toBe('z-blue')
    expect(right.value?.team_id).toBe('a-red')
    expect(colorFor(left.value?.team_id).text).toBe('text-mrc-blue-team')
    expect(colorFor(right.value?.team_id).text).toBe('text-mrc-red-team')
  })
})
