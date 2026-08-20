<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { resultText, playerSurnames } from '@/lib/matchResult'
import { useMatchSides } from '@/composables/useMatchSides'

// Compact scores row: side | result pill | side. The side that's ahead fills with its
// team colour; sides/colour come from useMatchSides (by team id) — never hardcoded.
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()
const { left, right, colorFor } = useMatchSides(
  () => props.match,
  () => props.teams,
)
// The team to emphasise: the winner once finished, the current leader while live. An
// all-square or unstarted match has neither, and stays grey.
const strong = computed(() => (props.match.finished ? props.match.winner_team_id : props.match.leader_team_id))

// A lead fills solid whether or not the match is over. This row tells the players in the
// match where they stand and they already know it's live, so it doesn't spend a lighter
// shade separating projected from decided the way the standings bar has to.
function sideClass(side: MatchSide | null): string {
  if (!strong.value || side?.team_id !== strong.value) return 'bg-mrc-panel-alt'
  return `${colorFor(side.team_id).solid} font-semibold text-white`
}
const centerClass = computed(() => {
  if (!strong.value) return 'bg-mrc-surface border-mrc-line text-mrc-ink'
  const c = colorFor(strong.value)
  return `${c.tint} ${c.line} ${c.text}`
})
</script>
<template>
  <div class="flex items-center py-2 text-center">
    <div class="w-2/5 truncate rounded-l border border-r-0 border-mrc-line p-2 shadow" :class="sideClass(left)">
      {{ left ? playerSurnames(left.players) : '' }}
    </div>
    <div class="w-1/5 rounded border py-3 text-lg font-bold uppercase tracking-tight shadow-md" :class="centerClass">
      {{ resultText(match) }}
    </div>
    <div class="w-2/5 truncate rounded-r border border-l-0 border-mrc-line p-2 shadow" :class="sideClass(right)">
      {{ right ? playerSurnames(right.players) : '' }}
    </div>
  </div>
</template>
