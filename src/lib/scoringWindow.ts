import type { Tournament } from '@/api/types'

// Today as the viewer reckons it, YYYY-MM-DD — directly comparable to a tournament's
// dates, which are plain calendar dates.
function today(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Whether the cup has begun. Distinct from scoringOpen, which is shut both before a
// tournament and after it — the same answer for two opposite situations. A cup that has
// not started has nothing to show; one that is over has all of it.
export function hasStarted(tournament: Tournament | null, now: Date = new Date()): boolean {
  if (!tournament) return false
  return today(now) >= tournament.start_date
}

// Whether scores can be recorded for a tournament: on any of its days. Deliberately not
// tied to a tee time, which moves for weather.
//
// Read in the viewer's zone, matching the times shown alongside. The server decides for
// real, and reads it at the course being played — the two can only disagree for someone
// scoring from another timezone within hours of midnight, and the server wins.
export function scoringOpen(tournament: Tournament | null, now: Date = new Date()): boolean {
  if (!tournament) return false
  const d = today(now)
  return d >= tournament.start_date && d <= tournament.end_date
}
