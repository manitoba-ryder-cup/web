import { describe, it, expect } from 'vitest'
import { scoringOpen } from '@/lib/scoringWindow'
import type { Tournament } from '@/api/types'

// The 2026 cup: two days at Buffalo Point, last group off at 15:50 local.
const cup: Tournament = {
  id: 't1',
  name: 'Manitoba Ryder Cup',
  start_date: '2026-09-18',
  end_date: '2026-09-19',
  location: 'Buffalo Point, Manitoba, Canada',
}
const at = (iso: string) => new Date(iso)

describe('scoringOpen', () => {
  it('is shut months before the cup', () => {
    expect(scoringOpen(cup, at('2026-03-01T12:00:00Z'))).toBe(false)
  })

  it('is shut the evening before', () => {
    expect(scoringOpen(cup, at('2026-09-18T04:00:00Z'))).toBe(false) // 11pm local the 17th
  })

  it('is open on each day of the cup', () => {
    expect(scoringOpen(cup, at('2026-09-18T13:00:00Z'))).toBe(true)
    expect(scoringOpen(cup, at('2026-09-19T15:00:00Z'))).toBe(true)
  })

  it('is still open for the last group after midnight UTC', () => {
    // Reading the dates as UTC would refuse their closing holes.
    expect(scoringOpen(cup, at('2026-09-20T01:20:00Z'))).toBe(true)
  })

  it('is shut the morning after', () => {
    expect(scoringOpen(cup, at('2026-09-20T14:00:00Z'))).toBe(false)
  })

  it('is shut when the tournament is unknown', () => {
    expect(scoringOpen(null, at('2026-09-18T13:00:00Z'))).toBe(false)
  })
})
