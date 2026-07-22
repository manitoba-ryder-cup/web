import type { TeamColorClasses } from '@/lib/teamColor'

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

// A won hole gets a faint team-colour tint behind the coloured digit — scannable down the
// column, softer than a solid fill. A played-but-lost hole is plain ink; an unplayed hole
// (no score) is faint.
export function scoreClass(won: boolean, val: number | null, meta: TeamColorClasses): string {
  if (won) return `${meta.tint} ${meta.text} font-bold`
  return val != null ? 'text-mrc-ink' : 'text-mrc-faint'
}
