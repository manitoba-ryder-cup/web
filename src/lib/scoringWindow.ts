import type { MatchResult } from '@/api/types'

// Both bounds come from the API (scoring_opens_at/scoring_closes_at), which is also what
// enforces them. This file used to hold its own copy of the two constants, which put one
// rule in two repos with nothing keeping them equal.
//
// A bound the API did not send is read as open rather than shut. That direction is
// deliberate: being permissive costs a clean 409 from the write, while being strict
// silently offers no way to record a legitimate score — the failure nobody can diagnose
// standing on a fairway.
function instant(value: string | undefined): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

// Whether a match is far enough along to be worth opening: it has teed off, or is about
// to. Stays true forever after — a played match is history, and history reads.
export function hasStarted(match: MatchResult | null, now: Date = new Date()): boolean {
  if (!match) return false
  const opens = instant(match.scoring_opens_at)
  return opens === null || now.getTime() >= opens
}

// Whether scores can still be recorded. Strictly narrower than hasStarted, and expressed
// in terms of it so the two can't drift into answering the same way for a match that
// hasn't teed off and one that finished last year — those read as opposites.
export function scoringOpen(match: MatchResult | null, now: Date = new Date()): boolean {
  if (!match || !hasStarted(match, now)) return false
  const closes = instant(match.scoring_closes_at)
  return closes === null || now.getTime() <= closes
}
