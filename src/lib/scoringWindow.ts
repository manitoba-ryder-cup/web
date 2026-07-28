import type { MatchResult } from '@/api/types'

// A match's scores can be recorded from shortly before it tees off until well after it
// could still be under way. Both bounds are relative to the tee time, which is an instant,
// so this needs no timezone.
//
// The API enforces the same rule (scoringOpensBefore/scoringClosesAfter in
// internal/golf/match.go) and is the one that decides — this copy only gates the UI, so
// the two need to agree roughly, not exactly. Keep this the wider of the two if they ever
// drift: being permissive costs a clean 409, being strict silently offers no way to record
// a legitimate score.
const OPENS_BEFORE_MS = 2 * 60 * 60 * 1000
const CLOSES_AFTER_MS = 12 * 60 * 60 * 1000

// Whether a match is far enough along to be worth opening: it has teed off, or is about
// to. Stays true forever after — a played match is history, and history reads.
export function hasStarted(match: MatchResult | null, now: Date = new Date()): boolean {
  if (!match) return false
  return now.getTime() >= new Date(match.tee_time).getTime() - OPENS_BEFORE_MS
}

// Whether scores can still be recorded. Strictly narrower than hasStarted, and expressed
// in terms of it so the two can't drift into answering the same way for a match that
// hasn't teed off and one that finished last year — those read as opposites.
export function scoringOpen(match: MatchResult | null, now: Date = new Date()): boolean {
  if (!match || !hasStarted(match, now)) return false
  return now.getTime() <= new Date(match.tee_time).getTime() + CLOSES_AFTER_MS
}
