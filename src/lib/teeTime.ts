// Shown in the viewer's own zone and locale, which Intl uses by default. Entering one is the
// other direction and does need a zone: see eventInputToUtc, which takes the course's.

// Time of day, e.g. "9:10 AM" — or 09:10 where the locale keeps a 24-hour clock.
export function formatTeeTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

// Day label, e.g. "Fri, Sep 18".
export function teeDayLabel(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

// A key, not display, so the locale is pinned to the one that spells a date YYYY-MM-DD and
// therefore sorts. The viewer's zone still decides which day an instant falls on.
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

// Where a course's own zone is not known yet: the tee sheet's zone beats the reader's.
export const CUP_TIME_ZONE = 'America/Winnipeg'

// UTC instant → a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") in event time.
export function utcToEventInput(iso: string, tz: string): string {
  const p = eventParts(new Date(iso), tz)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// Correct across DST: find the UTC time whose event-zone rendering matches the input, by
// guessing UTC then correcting by the zone's offset at that instant.
export function eventInputToUtc(wall: string, tz: string): string {
  const guess = new Date(`${wall}:00Z`)
  const p = eventParts(guess, tz)
  const asZone = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess.getTime() + (guess.getTime() - asZone)).toISOString()
}
