// Dates arrive as plain YYYY-MM-DD strings; parsing with a fixed local time
// (T00:00:00) avoids UTC-midnight rolling back a day in negative-offset zones.
export function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`
}
