import { describe, it, expect } from 'vitest'
import { formatTeeTime, teeDayLabel, teeDayKey, utcToEventInput, eventInputToUtc, DEFAULT_EVENT_TZ } from '@/lib/teeTime'

// One instant, read as the wall clock of wherever the cup is played.
const instant = '2026-09-19T01:20:00Z'

describe('tee times in the event, not the viewer, timezone', () => {
  it('renders the same instant differently per event', () => {
    expect(formatTeeTime(instant, 'America/Winnipeg')).toBe('8:20 PM')
    expect(formatTeeTime(instant, 'America/Phoenix')).toBe('6:20 PM')
    expect(formatTeeTime(instant, 'Pacific/Auckland')).toBe('1:20 PM')
  })

  it('puts the instant on a different day depending on the event', () => {
    // Still the 18th in Manitoba, already the 19th in Auckland — which is why the day
    // label and the grouping key both need the event's zone.
    expect(teeDayLabel(instant, 'America/Winnipeg')).toContain('Sep 18')
    expect(teeDayKey(instant, 'America/Winnipeg')).toBe('2026-09-18')
    expect(teeDayKey(instant, 'Pacific/Auckland')).toBe('2026-09-19')
  })

  it('round-trips an admin wall-clock entry through the event zone', () => {
    const wall = '2026-09-18T08:00'
    for (const tz of ['America/Winnipeg', 'America/Phoenix', 'Pacific/Auckland']) {
      expect(utcToEventInput(eventInputToUtc(wall, tz), tz)).toBe(wall)
    }
  })

  it('falls back to where the cup has always been played', () => {
    expect(formatTeeTime(instant)).toBe(formatTeeTime(instant, DEFAULT_EVENT_TZ))
    expect(DEFAULT_EVENT_TZ).toBe('America/Winnipeg')
  })
})
