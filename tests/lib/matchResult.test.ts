import { describe, it, expect } from 'vitest'
import {
  matchOutcome,
  resultText,
  playerNames,
  playerSurnames,
  playerInitials,
  placeholderPairing,
} from '@/lib/matchResult'
import type { MatchResult } from '@/api/types'

function match(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Singles',
    finished: true,
    winner_team_id: 't-1',
    leader_team_id: 't-1',
    lead: 3,
    holes_remaining: 2,
    sides: [],
    hole_results: [],
    tee_time: null,
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
  it('is in progress when unfinished with a side ahead', () => {
    expect(matchOutcome(match({ finished: false, winner_team_id: null, lead: 2 }))).toEqual({
      kind: 'in_progress',
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
  it('renders "In progress" when not finished but a side is ahead', () => {
    expect(resultText(match({ finished: false, winner_team_id: null, lead: 2 }))).toBe('In progress')
  })
})

describe('placeholderPairing', () => {
  it('gives one placeholder for Singles (1 v 1)', () => {
    expect(placeholderPairing('Singles').map((p) => `${p.first_name} ${p.last_name}`)).toEqual(['Player One'])
  })
  it('gives two placeholders for a team format', () => {
    expect(placeholderPairing('Fourball').map((p) => `${p.first_name} ${p.last_name}`)).toEqual([
      'Player One',
      'Player Two',
    ])
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
