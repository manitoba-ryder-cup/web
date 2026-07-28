// Dates arrive as plain YYYY-MM-DD strings; parsing with a fixed local time
// (T00:00:00) avoids UTC-midnight rolling back a day in negative-offset zones.
//
// Everything here renders in the viewer's own locale, so a date reads the way they expect
// it to. The optional `locale` is a test seam — the same trick as the injectable clock in
// scoringWindow — and production callers omit it.
const day = (d: string) => new Date(`${d}T00:00:00`)

const DAY_MONTH = { month: 'short', day: 'numeric' } as const
const FULL = { year: 'numeric', ...DAY_MONTH } as const

export function formatDate(d: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, FULL).format(day(d))
}

// formatRange, not two formatted dates joined by a dash: it states the shared parts once
// the way the locale wants them ("Sep 18 – 19, 2026", but "18 – 19 Sept 2026"), and folds
// a range that starts and ends the same day down to a single date on its own.
export function formatDateRange(start: string, end: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, FULL).formatRange(day(start), day(end))
}

// Day and month only, for where the year is already stated — a tournament card headed by
// its year would otherwise repeat it in every date beneath.
export function formatDayRange(start: string, end: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, DAY_MONTH).formatRange(day(start), day(end))
}
