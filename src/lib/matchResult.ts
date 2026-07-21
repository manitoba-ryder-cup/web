import type { MatchResult, MatchPlayer } from '@/api/types'

// The semantic outcome of a match, derived from the team-id result — never from a
// parsed display string. Rendering keys off `kind` (big numbers, "TIED", etc.).
export type MatchOutcome =
  | { kind: 'in_progress' }
  | { kind: 'tied' } // finished with no winner
  | { kind: 'up'; lead: number } // won at the last hole → "N up"
  | { kind: 'margin'; lead: number; holesRemaining: number } // decided early → "N & M"

export function matchOutcome(m: MatchResult): MatchOutcome {
  if (!m.finished) return { kind: 'in_progress' }
  if (!m.winner_team_id) return { kind: 'tied' }
  return m.holes_remaining > 0
    ? { kind: 'margin', lead: m.lead, holesRemaining: m.holes_remaining }
    : { kind: 'up', lead: m.lead }
}

// Compact one-line form (e.g. the MatchSummary pill). Components that need structure
// (MatchDetails) use matchOutcome directly rather than parsing this string.
export function resultText(m: MatchResult): string {
  const o = matchOutcome(m)
  switch (o.kind) {
    case 'in_progress':
      return 'In progress'
    case 'tied':
      return 'Tied'
    case 'up':
      return `${o.lead} up`
    case 'margin':
      return `${o.lead} & ${o.holesRemaining}`
  }
}

export function playerNames(players: MatchPlayer[]): string {
  return players.map((p) => `${p.first_name} ${p.last_name}`).join(' / ')
}

// Surnames only, joined by " / " for a pairing (e.g. "Bale" or "Bale / Phin").
export function playerSurnames(players: MatchPlayer[]): string {
  return players.map((p) => p.last_name).join(' / ')
}
