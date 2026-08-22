import { describe, it, expect } from 'vitest'
import { formatDate, formatDateRange, formatDayRange } from '@/lib/date'

// A locale is passed explicitly rather than asserting whatever the machine is set to. The
// separator Intl produces is a thin space around an en dash, not a plain space.
const EN_DASH = ' – '

describe('formatDate', () => {
  it('follows the viewer, month-first or day-first', () => {
    expect(formatDate('2026-09-18', 'en-US')).toBe('Sep 18, 2026')
    expect(formatDate('2026-09-18', 'en-GB')).toBe('18 Sept 2026')
  })

  it('reads the date as a local day, so it cannot slip back one', () => {
    // Parsed as UTC midnight this is the 17th anywhere west of Greenwich.
    expect(formatDate('2026-09-18', 'en-US')).toContain('18')
  })
})

describe('formatDateRange', () => {
  it('states the shared parts once, wherever the locale puts them', () => {
    expect(formatDateRange('2026-09-18', '2026-09-19', 'en-US')).toBe(`Sep 18${EN_DASH}19, 2026`)
    expect(formatDateRange('2026-09-18', '2026-09-19', 'en-GB')).toBe(`18${EN_DASH}19 Sept 2026`)
  })

  it('folds a single-day cup down to one date', () => {
    expect(formatDateRange('2026-09-18', '2026-09-18', 'en-US')).toBe('Sep 18, 2026')
  })
})

describe('formatDayRange', () => {
  it('names the month once inside a month, and both across one', () => {
    expect(formatDayRange('2026-09-18', '2026-09-19', 'en-US')).toBe(`Sep 18${EN_DASH}19`)
    expect(formatDayRange('2027-06-30', '2027-07-01', 'en-US')).toBe(`Jun 30${EN_DASH}Jul 1`)
  })

  it('puts the day first where the locale does — the case a hand-rolled collapse got wrong', () => {
    expect(formatDayRange('2026-09-18', '2026-09-19', 'en-GB')).toBe(`18${EN_DASH}19 Sept`)
    expect(formatDayRange('2027-06-30', '2027-07-01', 'en-GB')).toBe(`30 Jun${EN_DASH}1 Jul`)
  })

  it('folds a single-day cup down to one date', () => {
    expect(formatDayRange('2026-09-18', '2026-09-18', 'en-US')).toBe('Sep 18')
  })
})
