import type { MatchResult } from '@/api/types'

// Match-play result text: "3 & 2" (won with holes to spare), "2 up" (won at 18),
// "Halved" (finished level), or "In progress".
export function resultText(m: MatchResult): string {
  if (!m.finished) return 'In progress'
  if (!m.winner_color) return 'Halved'
  return m.holes_remaining > 0 ? `${m.lead} & ${m.holes_remaining}` : `${m.lead} up`
}

export function playerNames(players: MatchResult['red_players']): string {
  return players.map((p) => `${p.first_name} ${p.last_name}`).join(' / ')
}
