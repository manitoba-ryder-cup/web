import type { LineupPlayer, MatchResult, TournamentPlayer } from '@/api/types'

// A player plays at most once per round, and the round is the format rather than the cup. A
// name in another match of it is spent, as is one already in the draft being edited.
export function playersSpent(matches: MatchResult[], matchId: string, formatName: string, draft: LineupPlayer[]): Set<string> {
  const spent = new Set<string>()
  for (const other of matches) {
    if (other.match_id === matchId || other.format_name !== formatName) continue
    for (const side of other.sides) for (const player of side.players) spent.add(player.player_id)
  }
  for (const player of draft) spent.add(player.player_id)
  return spent
}

// This team's drafted players who are still free to be picked. Surname then first name.
export function availableForTeam(roster: TournamentPlayer[], teamId: string, spent: Set<string>): TournamentPlayer[] {
  return roster
    .filter((p) => p.team_id === teamId && !spent.has(p.player_id))
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
}

// The lineup a match already holds, flattened out of its sides.
export function storedLineup(match: MatchResult | null): LineupPlayer[] {
  return (match?.sides ?? []).flatMap((side) => side.players.map((p) => ({ player_id: p.player_id, team_id: side.team_id })))
}

// A lineup's identity, independent of the order it was built in — two lineups naming the same
// players on the same sides are the same lineup however they were assembled.
export function lineupKey(entries: LineupPlayer[]): string {
  return entries
    .map((p) => `${p.team_id}:${p.player_id}`)
    .sort()
    .join('|')
}

// Both sides full. Measured on the lineup rather than on what is drawn, so a change to how the
// page lays its panels out cannot move the gate on whether it can be saved.
export function lineupFull(entries: LineupPlayer[], teamIds: string[], perSide: number): boolean {
  return teamIds.length > 0 && teamIds.every((id) => entries.filter((p) => p.team_id === id).length === perSide)
}
