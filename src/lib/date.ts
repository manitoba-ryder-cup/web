// Dates arrive as plain YYYY-MM-DD strings; parsing with a fixed local time
// (T00:00:00) avoids UTC-midnight rolling back a day in negative-offset zones.
export function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`
}

// Day and month only, for where the year is already stated — a tournament card headed by
// its year would otherwise read "Jun 4, 2022 – Jun 5, 2022". A same-month range names the
// month once ("Jun 4 – 5"); one that crosses a month names both ("Jun 30 – Jul 1").
//
// Locale is pinned, like the tee-time helpers: dropping the second month only reads as a
// range when the month comes first. Left to the viewer's locale, a day-first one renders
// "18 Sept – 19", which says nothing.
export function formatDayRange(start: string, end: string): string {
  const from = new Date(`${start}T00:00:00`)
  const to = new Date(`${end}T00:00:00`)
  const dayMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start === end) return dayMonth(from)
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
  return sameMonth ? `${dayMonth(from)} – ${to.getDate()}` : `${dayMonth(from)} – ${dayMonth(to)}`
}
