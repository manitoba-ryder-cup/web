import { describe, it, expect } from 'vitest'
import {
  matchOutcome,
  resultText,
  playerNames,
  playerSurnames,
  playerInitials,
  placeholderPairing,
  matchCompleteMessage,
} from '@/lib/matchResult'
import type { MatchResult, MatchSide, MatchStatus } from '@/api/types'

function match(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Singles',
    scores_per_player: true,
    finished: true,
    winner_team_id: 't-1',
    leader_team_id: 't-1',
    lead: 3,
    holes_remaining: 2,
    sides: [],
    hole_results: [],
    tee_time: '2026-09-18T13:00:00Z',
    scoring_opens_at: '2026-09-18T11:00:00Z',
    scoring_closes_at: '2026-09-19T01:00:00Z',
    course_name: 'Test GC',
    ...overrides,
  }
}

describe('matchOutcome', () => {
  it('is all square when in progress and level (incl. not started)', () => {
    expect(matchOutcome(match({ finished: false, winner_team_id: null, lead: 0 }))).toEqual({
      kind: 'all_square',
    })
  })
  it('is the running lead when unfinished with a side ahead', () => {
    expect(matchOutcome(match({ finished: false, winner_team_id: null, lead: 2 }))).toEqual({
      kind: 'up',
      lead: 2,
    })
  })
  it('is tied when finished with no winner', () => {
    expect(matchOutcome(match({ finished: true, winner_team_id: null }))).toEqual({ kind: 'tied' })
  })
  it('is a margin when decided before the last hole', () => {
    expect(matchOutcome(match({ lead: 3, holes_remaining: 2 }))).toEqual({
      kind: 'margin',
      lead: 3,
      holesRemaining: 2,
    })
  })
  it('is "up" when won at the last hole', () => {
    expect(matchOutcome(match({ lead: 1, holes_remaining: 0 }))).toEqual({ kind: 'up', lead: 1 })
  })
})

describe('resultText', () => {
  it('renders "3 & 2" when won with holes to spare', () => {
    expect(resultText(match({ lead: 3, holes_remaining: 2 }))).toBe('3 & 2')
  })
  it('renders "2 up" when won at the last hole (no holes remaining)', () => {
    expect(resultText(match({ lead: 2, holes_remaining: 0 }))).toBe('2 up')
  })
  it('renders "Tied" when finished with no winner', () => {
    expect(resultText(match({ finished: true, winner_team_id: null }))).toBe('Tied')
  })
  it('renders "AS" when in progress and all square (no lead / no completed holes)', () => {
    expect(resultText(match({ finished: false, winner_team_id: null, lead: 0 }))).toBe('AS')
  })
  it('renders the running lead when not finished but a side is ahead', () => {
    expect(resultText(match({ finished: false, winner_team_id: null, lead: 2 }))).toBe('2 up')
  })
})

describe('placeholderPairing', () => {
  it('gives one placeholder for Singles (1 v 1)', () => {
    expect(placeholderPairing('Singles').map((p) => `${p.first_name} ${p.last_name}`)).toEqual(['Player One'])
  })
  it('gives two placeholders for a team format', () => {
    expect(placeholderPairing('Fourball').map((p) => `${p.first_name} ${p.last_name}`)).toEqual(['Player One', 'Player Two'])
  })
  it('gives each placeholder a stable, unique key', () => {
    const ids = placeholderPairing('Alt Shot').map((p) => p.player_id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('playerNames', () => {
  it('joins a single player name', () => {
    expect(playerNames([{ player_id: 'p1', first_name: 'Amy', last_name: 'Smith' }])).toBe('Amy Smith')
  })
  it('joins two players with " / "', () => {
    expect(
      playerNames([
        { player_id: 'p1', first_name: 'Amy', last_name: 'Smith' },
        { player_id: 'p2', first_name: 'Bo', last_name: 'Jones' },
      ]),
    ).toBe('Amy Smith / Bo Jones')
  })
})

describe('playerSurnames', () => {
  it('joins surnames with " / "', () => {
    expect(
      playerSurnames([
        { player_id: 'p1', first_name: 'Amy', last_name: 'Smith' },
        { player_id: 'p2', first_name: 'Bo', last_name: 'Jones' },
      ]),
    ).toBe('Smith / Jones')
  })
})

describe('playerInitials', () => {
  it('joins uppercased initials with " / "', () => {
    expect(
      playerInitials([
        { player_id: 'p1', first_name: 'amy', last_name: 'smith' },
        { player_id: 'p2', first_name: 'Bo', last_name: 'Jones' },
      ]),
    ).toBe('AS / BJ')
  })
})

describe('matchCompleteMessage', () => {
  const sides: MatchSide[] = [
    { team_id: 'blue', players: [{ player_id: 'p1', first_name: 'Travis', last_name: 'Bale' }] },
    { team_id: 'red', players: [{ player_id: 'p2', first_name: 'Sam', last_name: 'Phin' }] },
  ]
  // Built from the write's response, which is a MatchStatus — not the MatchResult the
  // page loaded, because that snapshot predates the score that ended the match.
  function status(overrides: Partial<MatchStatus> = {}): MatchStatus {
    return { finished: true, winner_team_id: 'blue', leader_team_id: 'blue', lead: 3, holes_remaining: 2, ...overrides }
  }

  it('names the winning side and the margin', () => {
    expect(matchCompleteMessage(status(), sides)).toBe('Match complete — Bale win 3 & 2')
  })

  it('reads as N up when it went to the last hole', () => {
    expect(matchCompleteMessage(status({ lead: 1, holes_remaining: 0 }), sides)).toBe('Match complete — Bale win 1 up')
  })

  it('says halved rather than naming a winner when nobody won', () => {
    expect(matchCompleteMessage(status({ winner_team_id: null, lead: 0, holes_remaining: 0 }), sides)).toBe('Match complete — halved')
  })

  it('falls back to the margin alone when the winning side is not in the lineup', () => {
    expect(matchCompleteMessage(status({ winner_team_id: 'ghost' }), sides)).toBe('Match complete — 3 & 2')
  })
})
