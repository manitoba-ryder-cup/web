import { describe, it, expect } from 'vitest'
import { hasStarted, scoringOpen } from '@/lib/scoringWindow'
import type { MatchResult } from '@/api/types'

// The window is measured from the tee time, so these need no timezone: every case below
// holds identically for a viewer in Winnipeg, Phoenix or Auckland.
const teeOff = new Date('2026-09-18T13:00:00Z')
const match = { tee_time: teeOff.toISOString() } as MatchResult
const at = (hours: number) => new Date(teeOff.getTime() + hours * 3600000)

describe('hasStarted', () => {
  it('is false while the match is still ahead', () => {
    expect(hasStarted(match, at(-24 * 60))).toBe(false)
    expect(hasStarted(match, at(-3))).toBe(false)
  })

  it('is true from the moment scoring opens', () => {
    expect(hasStarted(match, at(-2))).toBe(true)
    expect(hasStarted(match, at(0))).toBe(true)
  })

  it('stays true forever after — a played match is history, not a fixture', () => {
    // The distinction scoringOpen cannot make on its own: shut here and shut months
    // early read the same, but they are opposites to someone looking at the page.
    expect(hasStarted(match, at(24 * 365))).toBe(true)
    expect(scoringOpen(match, at(24 * 365))).toBe(false)
  })

  it('is false when the match is unknown', () => {
    expect(hasStarted(null, at(0))).toBe(false)
  })
})

describe('scoringOpen', () => {
  it('is shut before the window opens', () => {
    expect(scoringOpen(match, at(-24 * 60))).toBe(false)
    expect(scoringOpen(match, at(-3))).toBe(false)
  })

  it('is open across the round and the evening after it', () => {
    expect(scoringOpen(match, at(-2))).toBe(true) // warming up
    expect(scoringOpen(match, at(5))).toBe(true) // a slow round
    expect(scoringOpen(match, at(11))).toBe(true) // corrections that evening
    expect(scoringOpen(match, at(12))).toBe(true) // the last moment
  })

  it('is shut once the window closes', () => {
    expect(scoringOpen(match, at(13))).toBe(false)
    expect(scoringOpen(match, at(24 * 365))).toBe(false)
  })

  it('tracks each match separately, so one group cannot be scored from another', () => {
    // The tournament-wide window this replaced let Sunday's matches be scored on Saturday.
    const tomorrow = { tee_time: new Date(teeOff.getTime() + 20 * 3600000).toISOString() } as MatchResult
    expect(scoringOpen(match, at(0))).toBe(true)
    expect(scoringOpen(tomorrow, at(0))).toBe(false)
  })

  it('is shut when the match is unknown', () => {
    expect(scoringOpen(null, at(0))).toBe(false)
  })
})
