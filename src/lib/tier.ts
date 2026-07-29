// A player's per-tournament tier is named for a tee-box colour — gold, blue, white — so
// the colour IS the name, and nothing here adds a noun to it. Both paint jobs live
// together because they describe one vocabulary: a dot where space is tight, a pill where
// the name is worth reading. An unknown or unset tier falls back to neutral.
const TIER_DOT: Record<string, string> = {
  gold: 'bg-mrc-gold',
  silver: 'bg-mrc-faint',
  black: 'bg-mrc-ink',
  blue: 'bg-mrc-blue-team',
  white: 'bg-white ring-1 ring-inset ring-mrc-line-strong',
}

const TIER_BADGE: Record<string, string> = {
  gold: 'bg-mrc-gold text-white',
  silver: 'bg-mrc-faint text-white',
  black: 'bg-mrc-ink text-white',
  blue: 'bg-mrc-blue-team text-white',
  white: 'bg-white border border-mrc-line-strong text-mrc-ink',
}

export function tierDot(tier: string): string {
  return TIER_DOT[tier?.toLowerCase()] ?? 'bg-mrc-line-strong'
}

export function tierBadge(tier: string): string {
  return TIER_BADGE[tier?.toLowerCase()] ?? TIER_BADGE.white
}
