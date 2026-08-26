import { describe, it, expect } from 'vitest'
import { availableForTeam, playersTakenElsewhere } from '@/lib/lineup'
import type { MatchResult, TournamentPlayer } from '@/api/types'

const player = (player_id: string, last_name: string, team_id: string | null = 'blue') =>
  ({ player_id, last_name, first_name: 'A', team_id, tier: 'gold' }) as TournamentPlayer

const match = (match_id: string, format_name: string, ids: string[]): MatchResult =>
  ({
    match_id,
    format_name,
    sides: [{ team_id: 'blue', players: ids.map((id) => ({ player_id: id, first_name: 'A', last_name: 'B' })) }],
  }) as MatchResult

describe('playersTakenElsewhere', () => {
  // The round is the format. A name in the morning fourball is free again for the singles.
  it('counts only the matches of the same format', () => {
    const matches = [match('m2', 'Fourball', ['p1']), match('m3', 'Singles', ['p2'])]

    expect([...playersTakenElsewhere(matches, 'm1', 'Fourball')]).toEqual(['p1'])
  })

  // Its own players are the lineup being edited, not a clash with it — counting them would
  // empty the picker of everyone already chosen.
  it('does not count the match being edited', () => {
    const matches = [match('m1', 'Fourball', ['p1', 'p2'])]

    expect([...playersTakenElsewhere(matches, 'm1', 'Fourball')]).toEqual([])
  })

  it('reads every side of every other match of the round', () => {
    const matches = [match('m2', 'Fourball', ['p1']), match('m3', 'Fourball', ['p2'])]

    expect([...playersTakenElsewhere(matches, 'm1', 'Fourball')].sort()).toEqual(['p1', 'p2'])
  })
})

describe('availableForTeam', () => {
  const roster = [player('p1', 'Rabe'), player('p2', 'Benning'), player('p3', 'Horn', 'red'), player('p4', 'Undrafted', null)]

  it('offers this team only', () => {
    expect(availableForTeam(roster, 'blue', new Set()).map((p) => p.player_id)).toEqual(['p2', 'p1'])
  })

  it('leaves out anyone already spent', () => {
    expect(availableForTeam(roster, 'blue', new Set(['p1'])).map((p) => p.player_id)).toEqual(['p2'])
  })

  // Read down a list of names, so surname order is the only one that helps.
  it('sorts by surname', () => {
    expect(availableForTeam(roster, 'blue', new Set()).map((p) => p.last_name)).toEqual(['Benning', 'Rabe'])
  })
})
