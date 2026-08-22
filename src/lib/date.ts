// Parsed at a fixed local time, or UTC midnight rolls back a day in negative-offset zones.
// The optional `locale` is a test seam; production callers omit it.
const day = (d: string) => new Date(`${d}T00:00:00`)

const DAY_MONTH = { month: 'short', day: 'numeric' } as const
const FULL = { year: 'numeric', ...DAY_MONTH } as const

export function formatDate(d: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, FULL).format(day(d))
}

// formatRange states the shared parts once the way the locale wants them, and folds a range
// that starts and ends the same day down to one date.
export function formatDateRange(start: string, end: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, FULL).formatRange(day(start), day(end))
}

// Day and month only, for where the year is already stated — a tournament card headed by
// its year would otherwise repeat it in every date beneath.
export function formatDayRange(start: string, end: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, DAY_MONTH).formatRange(day(start), day(end))
}
