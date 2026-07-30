<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { useTeamPair } from '@/composables/useTeamPair'
import { splitPoints } from '@/lib/points'

// The signature standings bar. Two bars per match (each = ½ a point) so halved matches
// paint cleanly. From each end a team fills its DECIDED points in solid colour, then its
// PROJECTED points (in-progress matches it currently leads) in a lighter shade; genuine
// toss-ups (all-square, in-progress) stay grey. Order and colour come from the caller.
// `flat` drops the self-stick wrapper so the bar can be embedded in a caller's own sticky
// header (e.g. the hole-entry page); on its own it sticks under the hero.
const props = withDefaults(defineProps<{ results: MatchResult[]; teams: TournamentTeam[]; flat?: boolean }>(), {
  flat: false,
})

const { left, right, leftColors, rightColors } = useTeamPair(() => props.teams)
const numBars = computed(() => props.results.length * 2)

// Projected points = in-progress matches each side currently leads. Finished matches are
// already in the teams' points totals.
const projected = computed(() => {
  let l = 0
  let r = 0
  for (const m of props.results) {
    if (m.finished || !m.leader_team_id) continue
    if (m.leader_team_id === left.value?.id) l++
    else if (m.leader_team_id === right.value?.id) r++
  }
  return { l, r }
})

function blockClass(i: number): string {
  const lS = (left.value?.points ?? 0) * 2 // decided (solid) bars, from the left
  const lT = projected.value.l * 2 // projected (soft) bars
  const rS = (right.value?.points ?? 0) * 2 // decided, from the right
  const rT = projected.value.r * 2
  const n = numBars.value
  if (i <= lS) return leftColors.value.solid
  if (i <= lS + lT) return leftColors.value.soft
  if (i > n - rS) return rightColors.value.solid
  if (i > n - rS - rT) return rightColors.value.soft
  return 'bg-mrc-line'
}
function borderClass(i: number): string {
  if (i === props.results.length) return 'border-r-2 border-mrc-ink' // midline between the sides
  if (i % 2 === 0) return 'border-r border-white/40' // per-match separators
  return ''
}

const leftScore = computed(() => splitPoints(left.value?.points))
const rightScore = computed(() => splitPoints(right.value?.points))
</script>
<template>
  <div :class="flat ? '' : 'sticky top-0 z-10 bg-mrc-surface shadow'">
    <div class="relative min-h-20">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${numBars}, minmax(0, 1fr))` }">
        <div v-for="i in numBars" :key="i" class="h-20" :class="[blockClass(i), borderClass(i)]" />
      </div>
      <!-- Totals overlaid on the ends; the shadow keeps them legible over any team
           colour (or grey at 0 points). -->
      <div class="absolute inset-0 flex items-center justify-between px-3 font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">
        <div class="flex items-center gap-1 leading-none tracking-tight">
          <span class="text-6xl">{{ leftScore.whole }}</span>
          <span v-if="leftScore.half" class="text-3xl md:text-4xl mt-1">½</span>
        </div>
        <div class="flex items-center gap-1 leading-none tracking-tight">
          <span class="text-6xl">{{ rightScore.whole }}</span>
          <span v-if="rightScore.half" class="text-3xl md:text-4xl mt-1">½</span>
        </div>
      </div>
    </div>
  </div>
</template>
