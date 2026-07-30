// Tee times are stored as UTC instants and shown in the viewer's own zone and locale —
// Intl uses both by default, so the display helpers just format. `locale` is a test
// seam; production callers omit it. Entering a tee time is the other direction and does
// need a zone: see eventInputToUtc, which takes the course's.

// Time of day, e.g. "9:10 AM" — or 09:10 where the locale keeps a 24-hour clock.
export function formatTeeTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

// Time of day from a wall clock that carries no zone ("2026-09-18T08:00"), as admin pages
// show it. Intl is pinned to UTC so the digits come back exactly as given, while the locale
// still decides 12- vs 24-hour. Reading the string in the viewer's zone instead would shift
// a tee time for anyone away from the course, and an admin edits against the course's clock.
export function formatWallClock(wall: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`${wall}:00Z`))
}

// The course's wall clock, falling back to the viewer's zone if the server hasn't sent
// one yet. tee_time_local is required in the contract once the API ships this field, but
// web and scorecard deploy independently — if web goes out first, live responses briefly
// carry tee_time without it. formatWallClock(undefined) would build "undefined:00Z", which
// Intl parses as Invalid Date and then rejects with a RangeError, and that throw happens
// during render with no app-level error boundary — so it takes down the whole admin list,
// not just the one tee time. Falling back to the spectator formatter degrades to the
// pre-tee-time-editing behaviour for the length of the deploy window instead.
export function formatCourseTeeTime(teeTime: string, teeTimeLocal: string | undefined, locale?: string): string {
  return teeTimeLocal ? formatWallClock(teeTimeLocal, locale) : formatTeeTime(teeTime, locale)
}

// Day label, e.g. "Fri, Sep 18".
export function teeDayLabel(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

// Grouping key, not display — so the locale IS pinned, to the one that spells a date
// YYYY-MM-DD and therefore sorts. The viewer's zone still decides which day an instant
// falls on, which is what keeps a row under the heading it belongs to.
export function teeDayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

// Break a UTC instant into its wall-clock parts at the given course. Pinned like
// teeDayKey: these parts are reassembled into a datetime-local value, not shown.
function eventParts(d: Date, tz: string): Record<string, string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value
      return acc
    }, {})
}

// UTC instant → a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") in event time.
export function utcToEventInput(iso: string, tz: string): string {
  const p = eventParts(new Date(iso), tz)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// A datetime-local value ("YYYY-MM-DDTHH:mm"), meant in the event's timezone, → a UTC
// RFC3339 instant. Correct across DST: we find the UTC time whose event-zone rendering
// matches the input (guess it as UTC, then correct by the zone's offset at that instant).
export function eventInputToUtc(wall: string, tz: string): string {
  const guess = new Date(`${wall}:00Z`)
  const p = eventParts(guess, tz)
  const asZone = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess.getTime() + (guess.getTime() - asZone)).toISOString()
}
