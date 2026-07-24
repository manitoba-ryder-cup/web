// Draft flights (a player's per-tournament skill tier) are named for colours; a small dot
// paints each. An unknown or unset tier falls back to a neutral grey.
const TIER_DOT: Record<string, string> = {
  gold: 'bg-mrc-gold',
  silver: 'bg-mrc-faint',
  black: 'bg-mrc-ink',
  blue: 'bg-mrc-blue-team',
  white: 'bg-white ring-1 ring-inset ring-mrc-line-strong',
}

export function tierDot(tier: string): string {
  return TIER_DOT[tier?.toLowerCase()] ?? 'bg-mrc-line-strong'
}
