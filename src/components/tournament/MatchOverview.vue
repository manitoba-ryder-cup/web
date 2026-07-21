<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import TeamNames from './TeamNames.vue'
import MatchDetails from './MatchDetails.vue'

// Detailed match card: each side's players, the big result, and 18 hole dots coloured
// by who won each hole. Sides and holes are resolved by team id; colour comes from the
// tournament's teams (id -> colour) via the registry — never hardcoded here.
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()

const teamById = (id: string | null | undefined) => props.teams.find((t) => t.id === id) ?? null
const orderIndex = (id: string) => {
  const i = props.teams.findIndex((t) => t.id === id)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}
// Two sides in the tournament's stable team order (colour-independent left/right).
const ordered = computed(() =>
  [...props.match.sides].sort((a, b) => orderIndex(a.team_id) - orderIndex(b.team_id)))
const left = computed(() => ordered.value[0] ?? null)
const right = computed(() => ordered.value[1] ?? null)
const leftBorder = computed(() => `border-l-[5px] ${teamColor(teamById(left.value?.team_id)?.color).border}`)
const rightBorder = computed(() => `border-r-[5px] ${teamColor(teamById(right.value?.team_id)?.color).border}`)

const winnerTextClass = computed(() => {
  // No winner (tied or still in progress) reads softer than a coloured win.
  if (!props.match.finished || !props.match.winner_team_id) return 'text-mrc-muted'
  return teamColor(teamById(props.match.winner_team_id)?.color).text
})

function holeClass(hole: number): string {
  const r = props.match.hole_results
  if (hole <= r.length) {
    const winner = r[hole - 1]
    if (winner === null) return 'bg-mrc-line' // halved
    return `${teamColor(teamById(winner)?.color).solid} text-white`
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
