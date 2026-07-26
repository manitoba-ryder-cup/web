// Tee times are stored as UTC instants but belong to the event's local time — MBRC is
// always in Manitoba (Central) — so they're formatted in that zone, not UTC.
export const EVENT_TZ = 'America/Winnipeg'

// Time of day, e.g. "9:10 AM". Empty string when unscheduled.
export function formatTeeTime(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: EVENT_TZ }).format(new Date(iso))
}

// Day label, e.g. "Fri, Sep 18". "TBD" when unscheduled.
export function teeDayLabel(iso: string | null): string {
  if (!iso) return 'TBD'
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: EVENT_TZ }).format(new Date(iso))
}

// Event-local date key (not the UTC date, which can differ at day edges) for grouping.
export function teeDayKey(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

// Break a UTC instant into its event-timezone wall-clock parts.
function eventParts(d: Date): Record<string, string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TZ,
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
export function utcToEventInput(iso: string): string {
  const p = eventParts(new Date(iso))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// A datetime-local value ("YYYY-MM-DDTHH:mm"), meant in the event's timezone, → a UTC
// RFC3339 instant. Correct across DST: we find the UTC time whose event-zone rendering
// matches the input (guess it as UTC, then correct by the zone's offset at that instant).
export function eventInputToUtc(wall: string): string {
  const guess = new Date(`${wall}:00Z`)
  const p = eventParts(guess)
  const asZone = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess.getTime() + (guess.getTime() - asZone)).toISOString()
}
