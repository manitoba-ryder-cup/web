import type { MatchResult, TournamentPlayer } from '@/api/types'

// A player plays at most once per round, so a name placed in another match of the same format
// is spent for this one. The round is the format, not the tournament.
export function playersTakenElsewhere(matches: MatchResult[], matchId: string, formatName: string): Set<string> {
  const taken = new Set<string>()
  for (const other of matches) {
    if (other.match_id === matchId || other.format_name !== formatName) continue
    for (const side of other.sides) for (const player of side.players) taken.add(player.player_id)
  }
  return taken
}

// This team's drafted players who are still free to be picked, by surname.
export function availableForTeam(roster: TournamentPlayer[], teamId: string, taken: Set<string>): TournamentPlayer[] {
  return roster.filter((p) => p.team_id === teamId && !taken.has(p.player_id)).sort((a, b) => a.last_name.localeCompare(b.last_name))
}
