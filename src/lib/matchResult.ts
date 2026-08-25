import type { MatchPlayer, MatchSide, MatchStatus } from '@/api/types'

// The semantic outcome of a match, derived from the team-id result — never from a
// parsed display string. Rendering keys off `kind` (big numbers, "TIED", etc.).
export type MatchOutcome =
  | { kind: 'all_square' } // level (incl. no completed holes) → "AS"
  | { kind: 'tied' } // finished with no winner
  | { kind: 'up'; lead: number } // a side is N up → "N up" — in progress, or won at the last hole
  | { kind: 'margin'; lead: number; holesRemaining: number } // decided early → "N & M"

export function matchOutcome(m: MatchStatus): MatchOutcome {
  // A live match reads as its running state, exactly like the scorecard's per-hole status:
  // "N up" for whoever's ahead, "AS" when nobody's won a net hole yet (incl. not-started).
  if (!m.finished) return m.lead > 0 ? { kind: 'up', lead: m.lead } : { kind: 'all_square' }
  if (!m.winner_team_id) return { kind: 'tied' }
  return m.holes_remaining > 0 ? { kind: 'margin', lead: m.lead, holesRemaining: m.holes_remaining } : { kind: 'up', lead: m.lead }
}

// Compact one-line form (e.g. the MatchSummary pill). Components that need structure
// (MatchDetails) use matchOutcome directly rather than parsing this string.
export function resultText(m: MatchStatus): string {
  const o = matchOutcome(m)
  switch (o.kind) {
    case 'all_square':
      return 'AS'
    case 'tied':
      return 'Tied'
    case 'up':
      return `${o.lead} up`
    case 'margin':
      return `${o.lead} & ${o.holesRemaining}`
  }
}

// The scorecard shows the result but not that this save is what produced it.
export function matchCompleteMessage(state: MatchStatus, sides: MatchSide[]): string {
  if (matchOutcome(state).kind === 'tied') return 'Match complete — halved'
  const winner = sides.find((s) => s.team_id === state.winner_team_id)
  if (!winner) return `Match complete — ${resultText(state)}`
  return `Match complete — ${playerSurnames(winner.players)} win ${resultText(state)}`
}

// The slot exists, the lineup does not — mirrors the old app so an unassigned card still
// reads as a pairing.
export function placeholderPairing(format: string): MatchPlayer[] {
  const players: MatchPlayer[] = [{ player_id: 'placeholder-1', first_name: 'Player', last_name: 'One' }]
  if (format !== 'Singles') {
    players.push({ player_id: 'placeholder-2', first_name: 'Player', last_name: 'Two' })
  }
  return players
}

export function playerNames(players: MatchPlayer[]): string {
  return players.map((p) => `${p.first_name} ${p.last_name}`).join(' / ')
}

// Surnames only, joined by " / " for a pairing (e.g. "Bale" or "Bale / Phin").
export function playerSurnames(players: MatchPlayer[]): string {
  return players.map((p) => p.last_name).join(' / ')
}

// Initials, joined by " / " for a pairing (e.g. "TB" or "TB / SP"); used where space
// is tight, like the scorecard column headers.
export function playerInitials(players: MatchPlayer[]): string {
  return players.map((p) => `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase()).join(' / ')
}
