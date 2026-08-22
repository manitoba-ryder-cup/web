import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { teamColor, type TeamColorClasses } from '@/lib/teamColor'
import { orderSides } from '@/lib/teamOrder'

// Shared by every component that renders a match, so ordering and colour live in one place.
export function useMatchSides(match: MaybeRefOrGetter<MatchResult | null | undefined>, teams: MaybeRefOrGetter<TournamentTeam[]>) {
  const teamById = (id: string | null | undefined) => toValue(teams).find((t) => t.id === id) ?? null
  const ordered = computed(() => orderSides(toValue(match)?.sides ?? [], toValue(teams)))
  const left = computed<MatchSide | null>(() => ordered.value[0] ?? null)
  const right = computed<MatchSide | null>(() => ordered.value[1] ?? null)
  const colorFor = (teamId: string | null | undefined): TeamColorClasses => teamColor(teamById(teamId)?.color)
  return { left, right, colorFor }
}
