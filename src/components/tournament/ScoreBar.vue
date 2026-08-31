<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { useTeamPair } from '@/composables/useTeamPair'
import PointsTotal from '@/components/base/PointsTotal.vue'

// Two bars per match, each half a point, so a halved match paints cleanly. `flat` drops the
// self-stick wrapper for a caller with its own sticky header.
const props = withDefaults(defineProps<{ results: MatchResult[]; teams: TournamentTeam[]; flat?: boolean }>(), {
  flat: false,
})

const { left, right, leftColors, rightColors } = useTeamPair(() => props.teams)
const numBars = computed(() => props.results.length * 2)

// Projected points from the matches under way: a lead projects the point, all square the
// half each side would take. One not yet teed off is level too, but projects nothing.
const projected = computed(() => {
  let l = 0
  let r = 0
  for (const m of props.results) {
    if (m.finished || m.hole_results.length === 0) continue
    if (m.leader_team_id === left.value?.id) l += 1
    else if (m.leader_team_id === right.value?.id) r += 1
    else {
      l += 0.5
      r += 0.5
    }
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
        <PointsTotal :points="left?.points" />
        <PointsTotal :points="right?.points" />
      </div>
    </div>
  </div>
</template>
