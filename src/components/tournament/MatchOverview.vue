<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { useMatchSides } from '@/composables/useMatchSides'
import { placeholderPairing } from '@/lib/matchResult'
import TeamNames from './TeamNames.vue'
import MatchDetails from './MatchDetails.vue'

// Sides and colour come from useMatchSides by team id; nothing here hardcodes a colour.
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()
const { left, right, colorFor } = useMatchSides(
  () => props.match,
  () => props.teams,
)

// A seeded-but-unassigned slot has no sides yet; fall back to a placeholder pairing so the
// card still reads as "pairing vs pairing" instead of collapsing to just the result.
const leftPlayers = computed(() => (left.value?.players.length ? left.value.players : placeholderPairing(props.match.players_per_side)))
const rightPlayers = computed(() => (right.value?.players.length ? right.value.players : placeholderPairing(props.match.players_per_side)))

// Teams are known from the draft, so an unassigned card still shows the colours. They arrive
// in render order, so position is the side.
const leftBorder = computed(() => `border-l-[5px] ${colorFor(left.value?.team_id ?? props.teams[0]?.id).border}`)
const rightBorder = computed(() => `border-r-[5px] ${colorFor(right.value?.team_id ?? props.teams[1]?.id).border}`)

// All square has neither side ahead, and reads softer than a coloured lead.
const strongTextClass = computed(() => {
  const id = props.match.finished ? props.match.winner_team_id : props.match.leader_team_id
  return id ? colorFor(id).text : 'text-mrc-muted'
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
      <TeamNames :players="leftPlayers" align="left" :border-class="leftBorder" />
      <div class="flex w-1/5 items-center justify-center text-center">
        <MatchDetails :match="match" :text-class="strongTextClass" />
      </div>
      <TeamNames :players="rightPlayers" align="right" :border-class="rightBorder" />
    </div>
    <div class="flex justify-center p-4">
      <div
        v-for="hole in 18"
        :key="hole"
        class="mx-px flex h-5 w-5 items-center justify-center rounded-full text-xs tracking-tighter"
        :class="holeClass(hole)"
      >
        {{ hole }}
      </div>
    </div>
  </div>
</template>
