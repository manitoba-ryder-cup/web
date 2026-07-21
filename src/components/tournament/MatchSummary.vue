<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, MatchSide, TournamentTeam } from '@/api/types'
import { resultText, playerSurnames } from '@/lib/matchResult'
import { teamColor } from '@/lib/teamColor'

// Compact leaderboard row: side | result pill | side. The winning side fills with its
// team colour; sides are ordered/coloured from the tournament's teams (never hardcoded).
const props = defineProps<{ match: MatchResult; teams: TournamentTeam[] }>()

const teamById = (id: string | null | undefined) => props.teams.find((t) => t.id === id) ?? null
const orderIndex = (id: string) => {
  const i = props.teams.findIndex((t) => t.id === id)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}
const ordered = computed(() =>
  [...props.match.sides].sort((a, b) => orderIndex(a.team_id) - orderIndex(b.team_id)))
const left = computed(() => ordered.value[0] ?? null)
const right = computed(() => ordered.value[1] ?? null)
const winner = computed(() => (props.match.finished ? props.match.winner_team_id : null))

function sideClass(side: MatchSide | null): string {
  if (side && winner.value === side.team_id) {
    return `${teamColor(teamById(side.team_id)?.color).solid} font-semibold text-white`
  }
  return 'bg-mrc-panel-alt'
}
const centerClass = computed(() => {
  if (!winner.value) return 'bg-mrc-surface border-mrc-line'
  const c = teamColor(teamById(winner.value)?.color)
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
