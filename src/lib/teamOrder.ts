import type { MatchSide, TournamentTeam } from '@/api/types'

// Blue left, Red right — never by id, which is arbitrary. A match's sides carry only a
// team_id, so they are ordered against the teams here too. Unknown colours sort last.
export function teamColorRank(color: string | null | undefined): number {
  return color === 'Blue' ? 0 : color === 'Red' ? 1 : 2
}

export function orderTeams<T extends { color: string }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => teamColorRank(a.color) - teamColorRank(b.color))
}

// orderSides puts a match's two sides Blue-left/Red-right, resolving each side's colour
// from the tournament's teams (sides themselves carry no colour).
export function orderSides(sides: MatchSide[], teams: TournamentTeam[]): MatchSide[] {
  const colorOf = (id: string) => teams.find((t) => t.id === id)?.color
  return [...sides].sort((a, b) => teamColorRank(colorOf(a.team_id)) - teamColorRank(colorOf(b.team_id)))
}
