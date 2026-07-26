import type { Tournament } from '@/api/types'

// The small line above a hero — "2026 · Winnipeg". Either part may be missing.
export function tournamentEyebrow(t: Tournament | null | undefined): string {
  if (!t) return ''
  return [t.start_date?.slice(0, 4), t.location].filter(Boolean).join(' · ')
}
