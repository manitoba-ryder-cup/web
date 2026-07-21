<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { useMatchSides } from '@/composables/useMatchSides'
import TeamNames from './TeamNames.vue'
import MatchDetails from './MatchDetails.vue'

// Detailed match card: each side's players, the big result, and 18 hole dots coloured
// by who won each hole. Sides/colour come from useMatchSides (by team id) — nothing here
// hardcodes a colour.
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()
const { left, right, colorFor } = useMatchSides(() => props.match, () => props.teams)

const leftBorder = computed(() => `border-l-[5px] ${colorFor(left.value?.team_id).border}`)
const rightBorder = computed(() => `border-r-[5px] ${colorFor(right.value?.team_id).border}`)

const winnerTextClass = computed(() => {
  // No winner (tied or still in progress) reads softer than a coloured win.
  if (!props.match.finished || !props.match.winner_team_id) return 'text-mrc-muted'
  return colorFor(props.match.winner_team_id).text
})

function holeClass(hole: number): string {
  const r = props.match.hole_results
  if (hole <= r.length) {
    const winner = r[hole - 1]
    if (winner === null) return 'bg-mrc-line' // halved
    return `${colorFor(winner).solid} text-white`
  }
  // Unplayed: dimmed once the match is over, normal while it's still live.
  return props.match.finished ? 'text-mrc-faint' : 'text-mrc-ink'
}
</script>
<template>
  <div class="mb-6 overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
    <div class="flex border-b border-mrc-line">
      <TeamNames v-if="left" :players="left.players" align="left" :border-class="leftBorder" />
      <div class="flex w-1/5 items-center justify-center text-center">
        <MatchDetails :match="match" :text-class="winnerTextClass" />
      </div>
      <TeamNames v-if="right" :players="right.players" align="right" :border-class="rightBorder" />
    </div>
    <div class="flex justify-center p-4">
      <div v-for="hole in 18" :key="hole"
           class="mx-px flex h-5 w-5 items-center justify-center rounded-full text-xs tracking-tighter"
           :class="holeClass(hole)">
        {{ hole }}
      </div>
    </div>
  </div>
</template>
