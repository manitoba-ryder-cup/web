import { describe, it, expect } from 'vitest'
import { availableForTeam, playersSpent } from '@/lib/lineup'
import type { MatchResult, TournamentPlayer } from '@/api/types'

const player = (player_id: string, last_name: string, first_name = 'A', team_id: string | null = 'blue') =>
  ({ player_id, last_name, first_name, team_id, tier: 'gold' }) as TournamentPlayer

// Two sides, because a match is one against the other and the rule has to reach both. A
// fixture with one side leaves the red team's players readable as free.
const match = (match_id: string, format_name: string, blue: string[], red: string[] = []): MatchResult =>
  ({
    match_id,
    format_name,
    sides: [
      { team_id: 'blue', players: blue.map((id) => ({ player_id: id, first_name: 'A', last_name: 'B' })) },
      { team_id: 'red', players: red.map((id) => ({ player_id: id, first_name: 'A', last_name: 'B' })) },
    ],
  }) as MatchResult

describe('playersSpent', () => {
  // The round is the format. A name in the morning fourball is free again for the singles.
  it('counts only the matches of the same format', () => {
    const matches = [match('m2', 'Fourball', ['p1']), match('m3', 'Singles', ['p2'])]

    expect([...playersSpent(matches, 'm1', 'Fourball', [])]).toEqual(['p1'])
  })

  // Its own players are the lineup being edited, not a clash with it — counting them from the
  // stored match would empty the picker of everyone already chosen.
  it('does not count the match being edited', () => {
    const matches = [match('m1', 'Fourball', ['p1'], ['p2'])]

    expect([...playersSpent(matches, 'm1', 'Fourball', [])]).toEqual([])
  })

  // Both sides: reading only the first leaves an opponent already paired elsewhere offered as
  // though they were free.
  it('reads both sides of another match, not just the first', () => {
    const matches = [match('m2', 'Fourball', ['p1'], ['p2'])]

    expect([...playersSpent(matches, 'm1', 'Fourball', [])].sort()).toEqual(['p1', 'p2'])
  })

  it('reads every other match of the round', () => {
    const matches = [match('m2', 'Fourball', ['p1']), match('m3', 'Fourball', ['p2'])]

    expect([...playersSpent(matches, 'm1', 'Fourball', [])].sort()).toEqual(['p1', 'p2'])
  })

  // A name in the draft is spent too, or it stays in the list it was picked from.
  it('counts the draft being edited', () => {
    expect([...playersSpent([], 'm1', 'Fourball', [{ player_id: 'p9', team_id: 'blue' }])]).toEqual(['p9'])
  })
})

describe('availableForTeam', () => {
  const roster = [player('p1', 'Rabe'), player('p2', 'Benning'), player('p3', 'Horn', 'A', 'red'), player('p4', 'Undrafted', 'A', null)]

  it('offers this team only', () => {
    expect(availableForTeam(roster, 'blue', new Set()).map((p) => p.player_id)).toEqual(['p2', 'p1'])
  })

  it('leaves out anyone already spent', () => {
    expect(availableForTeam(roster, 'blue', new Set(['p1'])).map((p) => p.player_id)).toEqual(['p2'])
  })

  it('sorts by surname', () => {
    expect(availableForTeam(roster, 'blue', new Set()).map((p) => p.last_name)).toEqual(['Benning', 'Rabe'])
  })

  // Surname alone leaves two brothers in whatever order the roster response arrived in, which
  // can differ between refetches while every other list on the site holds them steady.
  it('settles a shared surname on the first name', () => {
    const brothers = [player('p5', 'Bale', 'Travis'), player('p6', 'Bale', 'Adam')]

    expect(availableForTeam(brothers, 'blue', new Set()).map((p) => p.first_name)).toEqual(['Adam', 'Travis'])
  })
})
