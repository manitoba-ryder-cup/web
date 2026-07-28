import { describe, it, expect } from 'vitest'
import { formatTeeTime, teeDayLabel, teeDayKey, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'

const instant = '2026-09-18T13:00:00Z' // 08:00 at a Manitoba course

describe('showing a tee time', () => {
  it('renders in the viewer’s own zone', () => {
    const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone
    const asViewer = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: viewer }).format(new Date(instant))
    expect(formatTeeTime(instant)).toBe(asViewer)
  })

  it('says TBD rather than nothing when a match is unscheduled', () => {
    expect(teeDayLabel(null)).toBe('TBD')
    expect(formatTeeTime(null)).toBe('')
    expect(teeDayKey(null)).toBe('')
  })

  it('groups by the same day it displays, so a row cannot land under the wrong header', () => {
    const viewerDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant))
    expect(teeDayKey(instant)).toBe(viewerDay)
  })
})

describe('entering a tee time', () => {
  // The other direction, and the only one that needs a zone: an admin types the wall
  // clock off the tee sheet and the course says what instant that was.
  it('reads the typed wall clock at the course', () => {
    expect(eventInputToUtc('2026-09-18T08:00', 'America/Winnipeg')).toBe('2026-09-18T13:00:00.000Z')
    expect(eventInputToUtc('2026-09-18T08:00', 'America/Phoenix')).toBe('2026-09-18T15:00:00.000Z')
  })

  it('round-trips whatever the course’s zone is', () => {
    const wall = '2026-09-18T08:00'
    for (const tz of ['America/Winnipeg', 'America/Phoenix', 'Pacific/Auckland']) {
      expect(utcToEventInput(eventInputToUtc(wall, tz), tz)).toBe(wall)
    }
  })
})
