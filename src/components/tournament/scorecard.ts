import type { TeamColorClasses } from '@/lib/teamColor'

// Which scores the card shows: each side's best ball, or one side's two players.
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

// A tint rather than a fill: scannable down the column and softer. A played-but-unmarked hole
// is plain ink; an unplayed one is faint.
export function scoreClass(won: boolean, val: number | null, meta: TeamColorClasses): string {
  if (won) return `${meta.tint} ${meta.text} font-bold`
  return val != null ? 'text-mrc-ink' : 'text-mrc-faint'
}
