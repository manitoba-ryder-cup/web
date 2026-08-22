import type { MatchResult } from '@/api/types'

// eslint-disable-next-line comment-cap/max-lines -- names the local copy this file used to
// hold, which is the change someone would otherwise make again.
// Both bounds come from the API, which also enforces them. This file used to restate the two
// constants, putting one rule in two repos with nothing keeping them equal. A bound the API
// did not send reads as open, deliberately: permissive costs a clean 409, while strict
// silently offers no way to record a legitimate score.
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

// Expressed in terms of hasStarted so the two cannot drift into answering the same way for a
// match that has not teed off and one that finished last year.
export function scoringOpen(match: MatchResult | null, now: Date = new Date()): boolean {
  if (!match || !hasStarted(match, now)) return false
  const closes = instant(match.scoring_closes_at)
  return closes === null || now.getTime() <= closes
}

// One function because it is one rule: stated in both the entry page and the card, a change
// to either leaves rows inviting a tap the page turns straight back.
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
