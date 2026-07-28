import type { Tournament } from '@/api/types'

// Where the cup is played. A tournament's start and end are calendar dates, and a
// calendar date only means anything somewhere: read as UTC, the final day ends at 19:00
// local and cuts off the last group mid-round, because an afternoon tee time in Manitoba
// finishes after midnight UTC. The server applies the same rule in the same zone.
const EVENT_TIME_ZONE = 'America/Winnipeg'

// Today where the golf is played, as YYYY-MM-DD — directly comparable to the tournament's
// dates, which are plain calendar dates on the wire.
function todayAtTheCup(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
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
