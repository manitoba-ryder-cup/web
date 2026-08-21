import { describe, it, expect } from 'vitest'
import { recordsScorePerPlayer } from '@/lib/matchFormat'

describe('recordsScorePerPlayer', () => {
  it('is true for the formats that score each player', () => {
    expect(recordsScorePerPlayer('Fourball')).toBe(true)
    expect(recordsScorePerPlayer('Singles')).toBe(true)
  })

  // Two players a side, one ball: the API sends no player scores for these at all.
  it('is false for the one-ball formats', () => {
    expect(recordsScorePerPlayer('Alt Shot')).toBe(false)
    expect(recordsScorePerPlayer('Scramble')).toBe(false)
    expect(recordsScorePerPlayer('Scotch')).toBe(false)
  })

  it('is false when the format is unknown', () => {
    expect(recordsScorePerPlayer(null)).toBe(false)
    expect(recordsScorePerPlayer(undefined)).toBe(false)
    expect(recordsScorePerPlayer('')).toBe(false)
  })
})
