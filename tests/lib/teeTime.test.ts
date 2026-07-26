import { describe, it, expect } from 'vitest'
import { formatTeeTime, teeDayLabel, teeDayKey, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'

// Tee times are UTC instants shown in the event's zone (America/Winnipeg). The zone is
// CDT (UTC−5) in summer and CST (UTC−6) in winter, so every conversion is checked on
// both sides of DST — the offset changing is exactly what these helpers must get right.

describe('formatTeeTime', () => {
  it('is empty when unscheduled', () => {
    expect(formatTeeTime(null)).toBe('')
  })

  it('renders a summer (CDT, UTC−5) instant in event time', () => {
    // 14:10Z − 5h = 9:10 AM in Winnipeg.
    expect(formatTeeTime('2026-09-18T14:10:00Z')).toBe('9:10 AM')
  })

  it('renders a winter (CST, UTC−6) instant in event time', () => {
    // 15:10Z − 6h = 9:10 AM in Winnipeg — same wall-clock, different UTC than summer.
    expect(formatTeeTime('2026-01-15T15:10:00Z')).toBe('9:10 AM')
  })
})

describe('teeDayLabel', () => {
  it('is TBD when unscheduled', () => {
    expect(teeDayLabel(null)).toBe('TBD')
  })

  it('labels the event-local day', () => {
    expect(teeDayLabel('2026-09-18T14:10:00Z')).toBe('Fri, Sep 18')
  })

  it('uses the event-local day, not the UTC day, at a day boundary', () => {
    // 02:00Z Sep 19 is 9:00 PM Sep 18 in Winnipeg — the label follows the local day.
    expect(teeDayLabel('2026-09-19T02:00:00Z')).toBe('Fri, Sep 18')
  })
})

describe('teeDayKey', () => {
  it('is empty when unscheduled', () => {
    expect(teeDayKey(null)).toBe('')
  })

  it('groups by the event-local date, not the UTC date', () => {
    // Same instant as above: UTC date is the 19th, event date is the 18th.
    expect(teeDayKey('2026-09-19T02:00:00Z')).toBe('2026-09-18')
  })
})

describe('utcToEventInput', () => {
  it('converts a summer instant to a datetime-local value', () => {
    expect(utcToEventInput('2026-09-18T14:10:00Z')).toBe('2026-09-18T09:10')
  })

  it('converts a winter instant to a datetime-local value', () => {
    expect(utcToEventInput('2026-01-15T15:10:00Z')).toBe('2026-01-15T09:10')
  })
})

describe('eventInputToUtc', () => {
  it('reads a summer wall-clock value as CDT (UTC−5)', () => {
    expect(eventInputToUtc('2026-09-18T09:10')).toBe('2026-09-18T14:10:00.000Z')
  })

  it('reads a winter wall-clock value as CST (UTC−6)', () => {
    expect(eventInputToUtc('2026-01-15T09:10')).toBe('2026-01-15T15:10:00.000Z')
  })
})

describe('round trip', () => {
  it('utcToEventInput ∘ eventInputToUtc is identity across DST', () => {
    for (const wall of ['2026-09-18T09:10', '2026-01-15T09:10', '2026-07-24T18:45']) {
      expect(utcToEventInput(eventInputToUtc(wall))).toBe(wall)
    }
  })
})
