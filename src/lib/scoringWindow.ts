import type { Tournament } from '@/api/types'
import { EVENT_TZ } from '@/lib/teeTime'

// Today where the golf is played, as YYYY-MM-DD — directly comparable to the tournament's
// dates, which are plain calendar dates and so mean nothing without a zone. Read as UTC
// the final day would end at 19:00 local, cutting off a last group that tees off in the
// afternoon and finishes past midnight UTC. The server applies the same rule in the same
// zone.
function todayAtTheCup(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// Whether scores can be recorded for a tournament: on any of its days. Deliberately not
// tied to a tee time, which moves for weather and isn't stored as a dependable instant.
export function scoringOpen(tournament: Tournament | null, now: Date = new Date()): boolean {
  if (!tournament) return false
  const today = todayAtTheCup(now)
  return today >= tournament.start_date && today <= tournament.end_date
}
