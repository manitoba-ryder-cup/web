import { describe, it, expect, vi } from 'vitest'
import { formatTeeTime, formatWallClock, teeDayLabel, teeDayKey, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'

const instant = '2026-09-18T13:00:00Z' // 08:00 at a Manitoba course

describe('showing a tee time', () => {
  it('renders in the viewer’s own zone', () => {
    const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone
    const asViewer = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: viewer }).format(new Date(instant))
    expect(formatTeeTime(instant, 'en-US')).toBe(asViewer)
  })

  it('follows the viewer’s clock convention too', () => {
    // Same instant, same zone — only the locale differs, so this is the 12- vs 24-hour
    // split rather than anything about when the group goes out.
    expect(formatTeeTime(instant, 'en-US')).toMatch(/AM|PM/)
    expect(formatTeeTime(instant, 'en-GB')).not.toMatch(/AM|PM/)
  })

  it('groups by the same day it displays, so a row cannot land under the wrong header', () => {
    const viewerDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant))
    expect(teeDayKey(instant)).toBe(viewerDay)
    const asViewer = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(instant))
    expect(teeDayLabel(instant, 'en-US')).toBe(asViewer)
  })

  // The key is a sort key, so its shape must not move with the reader.
  it('keeps the grouping key YYYY-MM-DD whatever the viewer’s locale', () => {
    expect(teeDayKey(instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
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

describe('showing a tee time on an admin page', () => {
  // An admin works a tee sheet, and the tee sheet says 8:00 wherever the admin is sitting.
  const wall = '2026-09-18T08:00' // the course's clock for the instant above

  it('renders the course’s clock, not the viewer’s', () => {
    expect(formatWallClock(wall, 'en-US')).toBe('8:00 AM')
  })

  it('still follows the viewer’s clock convention', () => {
    // Node's Intl doesn't zero-pad an explicit `hour: 'numeric'` even in a 24-hour
    // locale (unlike `timeStyle: 'short'`) — same quirk formatTeeTime already lives
    // with. The assertion here is 24-hour-with-no-AM/PM, not the padding.
    expect(formatWallClock(wall, 'en-GB')).toBe('8:00')
  })

  it('does not shift with the reader, unlike the spectator helper', () => {
    // The point of the pair: same tee time, and only formatTeeTime moves with the viewer.
    const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone
    const asViewer = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: viewer }).format(new Date(instant))
    expect(formatTeeTime(instant, 'en-US')).toBe(asViewer)
    expect(formatWallClock(wall, 'en-US')).toBe('8:00 AM')
  })

  it('reads midnight and noon the way a tee sheet does', () => {
    expect(formatWallClock('2026-09-18T00:00', 'en-US')).toBe('12:00 AM')
    expect(formatWallClock('2026-09-18T12:00', 'en-US')).toBe('12:00 PM')
  })

  it('still reads 8:00 AM from a host sitting in Auckland', () => {
    // CI runs on ubuntu-latest with no TZ set, i.e. a UTC host — where the `timeZone: 'UTC'`
    // pin is invisible, because "pinned to UTC" and "read on a UTC host" produce the same
    // digits. Losing the pin only breaks on a host somewhere else, so the regression this
    // guards against (formatWallClock silently drifting to the viewer's zone, the exact bug
    // the whole design avoids) is unobservable without simulating one. Auckland's offset
    // (UTC+12/+13) is far enough from UTC that a dropped pin can't coincidentally still
    // pass. There's no clock/locale seam for "host zone" — process.env.TZ is the host
    // itself, not a value formatWallClock takes — so this reaches for vi.stubEnv rather
    // than the injectable-clock convention the rest of the suite uses.
    vi.stubEnv('TZ', 'Pacific/Auckland')
    try {
      expect(formatWallClock(wall, 'en-US')).toBe('8:00 AM')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
