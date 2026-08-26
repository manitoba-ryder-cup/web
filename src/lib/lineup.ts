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
