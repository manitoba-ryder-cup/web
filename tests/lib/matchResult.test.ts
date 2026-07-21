import { describe, it, expect } from 'vitest'
import { resultText, playerNames } from '@/lib/matchResult'
import type { MatchResult } from '@/api/types'

function match(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Singles',
    finished: true,
    winner_color: 'Red',
    lead: 3,
    holes_remaining: 2,
    red_players: [],
    blue_players: [],
    ...overrides,
  }
}

describe('resultText', () => {
  it('renders "3 & 2" when won with holes to spare', () => {
    expect(resultText(match({ lead: 3, holes_remaining: 2 }))).toBe('3 & 2')
  })
  it('renders "2 up" when won at the last hole (no holes remaining)', () => {
    expect(resultText(match({ lead: 2, holes_remaining: 0 }))).toBe('2 up')
  })
  it('renders "Halved" when finished with no winner', () => {
    expect(resultText(match({ finished: true, winner_color: '' }))).toBe('Halved')
  })
  it('renders "In progress" when not finished', () => {
    expect(resultText(match({ finished: false, winner_color: '' }))).toBe('In progress')
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
