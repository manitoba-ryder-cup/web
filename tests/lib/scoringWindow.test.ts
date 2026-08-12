import { describe, it, expect } from 'vitest'
import { hasStarted, scoringOpen } from '@/lib/scoringWindow'
import type { MatchResult } from '@/api/types'

// The API sends the window as two instants, so these need no timezone: every case below
// holds identically for a viewer in Winnipeg, Phoenix or Auckland.
const teeOff = new Date('2026-09-18T13:00:00Z')
const at = (hours: number) => new Date(teeOff.getTime() + hours * 3600000)

// A match as the API sends it: the window straddling the tee time by the server's 2h/12h.
// Those numbers are the server's to change — restating them here would only assert this
// fixture against itself, so the tests below read the bounds off the fixture.
const matchAt = (tee: Date, opensBefore = 2, closesAfter = 12) =>
  ({
    tee_time: tee.toISOString(),
    scoring_opens_at: new Date(tee.getTime() - opensBefore * 3600000).toISOString(),
    scoring_closes_at: new Date(tee.getTime() + closesAfter * 3600000).toISOString(),
  }) as MatchResult

const match = matchAt(teeOff)

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
    const tomorrow = matchAt(at(20))
    expect(scoringOpen(match, at(0))).toBe(true)
    expect(scoringOpen(tomorrow, at(0))).toBe(false)
  })

  // The server owns the numbers now, so a change there has to reach the UI without a
  // release here. A match carrying a window this client has never heard of must be gated
  // on what it was sent, not on what 2h/12h would have implied.
  it('follows a window the server widened, without knowing the new numbers', () => {
    const wide = matchAt(teeOff, 6, 30)
    expect(scoringOpen(wide, at(-5))).toBe(true)
    expect(scoringOpen(wide, at(25))).toBe(true)
    expect(scoringOpen(match, at(-5))).toBe(false)
  })

  it('is shut when the match is unknown', () => {
    expect(scoringOpen(null, at(0))).toBe(false)
  })
})

// The API is what decides, so a bound it did not send must not become a UI that refuses to
// open. Permissive costs a clean 409; strict silently offers no way to record a legitimate
// score, and gives the scorer nothing to go on.
describe('a window the API did not send', () => {
  it('leaves scoring available rather than blocking it', () => {
    const bare = { tee_time: teeOff.toISOString() } as MatchResult
    expect(hasStarted(bare, at(-24 * 60))).toBe(true)
    expect(scoringOpen(bare, at(24 * 365))).toBe(true)
  })

  it('does the same for a bound it cannot parse', () => {
    const broken = { ...matchAt(teeOff), scoring_opens_at: 'not a date', scoring_closes_at: '' } as MatchResult
    expect(hasStarted(broken, at(-99))).toBe(true)
    expect(scoringOpen(broken, at(99))).toBe(true)
  })

  it('still reports an unknown match as shut', () => {
    expect(hasStarted(null, at(0))).toBe(false)
    expect(scoringOpen(null, at(0))).toBe(false)
  })
})
