import { describe, it, expect } from 'vitest'
import { formatDayRange } from '@/lib/date'

// Real cups: 2026 sat inside September, 2022 inside June, and a June 30 – July 1 range is
// the case that has to name both months.
describe('formatDayRange', () => {
  it('names the month once when the range stays inside it', () => {
    expect(formatDayRange('2026-09-18', '2026-09-19')).toBe('Sep 18 – 19')
  })

  it('names both months when the range crosses one', () => {
    expect(formatDayRange('2027-06-30', '2027-07-01')).toBe('Jun 30 – Jul 1')
  })

  // Also pins the local-midnight parsing this module documents: read as UTC, this renders
  // as the 17th anywhere west of Greenwich.
  it('collapses a single-day cup to one date', () => {
    expect(formatDayRange('2026-09-18', '2026-09-18')).toBe('Sep 18')
  })
})
