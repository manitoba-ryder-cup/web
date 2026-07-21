<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { resultText, playerSurnames } from '@/lib/matchResult'
import { useMatchSides } from '@/composables/useMatchSides'

// Compact leaderboard row: side | result pill | side. The winning side fills with its
// team colour; sides/colour come from useMatchSides (by team id) — never hardcoded.
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()
const { left, right, colorFor } = useMatchSides(() => props.match, () => props.teams)
const winner = computed(() => (props.match.finished ? props.match.winner_team_id : null))

function sideClass(side: MatchSide | null): string {
  if (side && winner.value === side.team_id) {
    return `${colorFor(side.team_id).solid} font-semibold text-white`
  }
  return 'bg-mrc-panel-alt'
}
const centerClass = computed(() => {
  if (!winner.value) return 'bg-mrc-surface border-mrc-line'
  const c = colorFor(winner.value)
  return `${c.tint} ${c.line}`
})
</script>
<template>
  <div class="flex items-center py-2 text-center">
    <div class="w-2/5 truncate rounded-l border border-r-0 border-mrc-line p-2 shadow" :class="sideClass(left)">
      {{ left ? playerSurnames(left.players) : '' }}
    </div>
    <div class="w-1/5 rounded border py-3 text-lg font-semibold uppercase tracking-wide shadow-md" :class="centerClass">
      {{ resultText(match) }}
    </div>
    <div class="w-2/5 truncate rounded-r border border-l-0 border-mrc-line p-2 shadow" :class="sideClass(right)">
      {{ right ? playerSurnames(right.players) : '' }}
    </div>
  </div>
</template>
