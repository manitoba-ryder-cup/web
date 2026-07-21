import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { teamColor, type TeamColorClasses } from '@/lib/teamColor'

// Resolves a match's two sides against the tournament's teams: a stable left/right order
// (by team position, colour-independent) and a colour lookup by team id. Shared by every
// component that renders a match, so the ordering/colour logic lives in exactly one place.
export function useMatchSides(
  match: MaybeRefOrGetter<MatchResult>,
  teams: MaybeRefOrGetter<TournamentTeam[]>,
) {
  const teamById = (id: string | null | undefined) => toValue(teams).find((t) => t.id === id) ?? null
  const orderIndex = (id: string) => {
    const i = toValue(teams).findIndex((t) => t.id === id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const ordered = computed(() =>
    [...toValue(match).sides].sort((a, b) => orderIndex(a.team_id) - orderIndex(b.team_id)))
  const left = computed<MatchSide | null>(() => ordered.value[0] ?? null)
  const right = computed<MatchSide | null>(() => ordered.value[1] ?? null)
  const colorFor = (teamId: string | null | undefined): TeamColorClasses => teamColor(teamById(teamId)?.color)
  return { left, right, colorFor }
}
