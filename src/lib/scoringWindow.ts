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

// Whether a given hole can still be recorded — the rule the entry page enforces and the
// scorecard uses to decide whether tapping a row leads anywhere. One function because it
// is one rule: stated in both places, a change to either leaves rows inviting a tap the
// page turns straight back.
//
// `finished` is passed rather than read off the match: a save that closes the match out
// knows before the reloaded match does.
export function holeOpen(
  match: MatchResult | null,
  hole: number,
  state: { finished: boolean; scoredHoles: number[] },
  now: Date = new Date(),
): boolean {
  if (!scoringOpen(match, now)) return false
  // A decided match still takes corrections to the holes it was played over — a typo can
  // be what closed it out early — and refuses only the holes past them, as the server does.
  return !(state.finished && !state.scoredHoles.includes(hole))
}

// Inherits the permissive reading above, where the bias protects a write. Here it runs the
// other way: one bound that will not parse reads as in play all year.
export function cupInPlay(matches: MatchResult[], now: Date = new Date()): boolean {
  return matches.some((m) => scoringOpen(m, now))
}
