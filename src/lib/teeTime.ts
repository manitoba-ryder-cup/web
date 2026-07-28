// Tee times are stored as UTC instants and shown in the viewer's own zone — Intl uses it
// by default, so these helpers just format. Entering a tee time is the other direction
// and does need a zone: see eventInputToUtc, which takes the course's.

// Time of day, e.g. "9:10 AM".
export function formatTeeTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

// Day label, e.g. "Fri, Sep 18".
export function teeDayLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

// Date key for grouping, in the viewer's zone so it matches the times shown beside it.
export function teeDayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

// Break a UTC instant into its wall-clock parts at the given course.
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
