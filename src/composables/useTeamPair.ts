import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'

// Teams are ordered once at the API boundary, so position is the order — this saves every
// hero and bar repeating the same four lines.
export function useTeamPair(teams: MaybeRefOrGetter<TournamentTeam[]>) {
  const left = computed(() => toValue(teams)[0] ?? null)
  const right = computed(() => toValue(teams)[1] ?? null)
  const leftColors = computed(() => teamColor(left.value?.color))
  const rightColors = computed(() => teamColor(right.value?.color))
  return { left, right, leftColors, rightColors }
}
