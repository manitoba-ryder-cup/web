import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { teamColor, type TeamColorClasses } from '@/lib/teamColor'
import { orderSides } from '@/lib/teamOrder'

// Resolves a match's two sides against the tournament's teams: a fixed left/right order
// (Blue left, Red right) and a colour lookup by team id. Shared by every component that
// renders a match, so the ordering/colour logic lives in exactly one place.
export function useMatchSides(
  match: MaybeRefOrGetter<MatchResult | null | undefined>,
  teams: MaybeRefOrGetter<TournamentTeam[]>,
) {
  const teamById = (id: string | null | undefined) => toValue(teams).find((t) => t.id === id) ?? null
  const ordered = computed(() => orderSides(toValue(match)?.sides ?? [], toValue(teams)))
  const left = computed<MatchSide | null>(() => ordered.value[0] ?? null)
  const right = computed<MatchSide | null>(() => ordered.value[1] ?? null)
  const colorFor = (teamId: string | null | undefined): TeamColorClasses => teamColor(teamById(teamId)?.color)
  return { left, right, colorFor }
}
