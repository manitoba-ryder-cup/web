import type { TeamColorClasses } from '@/lib/teamColor'

// Which scores the card is showing: the match (each side's best ball, the default) or one
// side's two players. A fourball is the only format that records more than one score a
// side, so it is the only one with anything else to show.
export type ScorecardView = 'match' | 'left' | 'right'

// One rendered scorecard row: the two best-ball scores, who won each, the tee-set figures
// (par/hdcp/yards), and the running match state after the hole ("2 UP" / "AS").
export interface HoleRow {
  hole: number
  left: number | null
  right: number | null
  leftWon: boolean
  rightWon: boolean
  par: number | null
  hdcp: number | null
  yards: number | null
  state: { text: string; cls: string } | null
}

// Marked scores get a faint team-colour tint behind the coloured digit — scannable down
// the column, softer than a solid fill. What "marked" means follows the view: in the match
// it is the side that won the hole; in a side's own view it is the score that counted for
// them, which is how the card says who carried a hole. A played-but-unmarked hole is plain
// ink; an unplayed hole (no score) is faint.
export function scoreClass(won: boolean, val: number | null, meta: TeamColorClasses): string {
  if (won) return `${meta.tint} ${meta.text} font-bold`
  return val != null ? 'text-mrc-ink' : 'text-mrc-faint'
}
