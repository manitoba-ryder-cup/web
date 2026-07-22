<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'

// The signature standings bar. Two bars per match (each = ½ a point) so halved matches
// paint cleanly. From each end a team fills its DECIDED points in solid colour, then its
// PROJECTED points (in-progress matches it currently leads) in a lighter shade; genuine
// toss-ups (all-square, in-progress) stay grey. Order and colour come from the caller.
// `flat` drops the self-stick wrapper so the bar can be embedded in a caller's own sticky
// header (e.g. the hole-entry page); on its own it sticks under the hero.
const props = withDefaults(defineProps<{ results: MatchResult[]; teams: TournamentTeam[]; flat?: boolean }>(), {
  flat: false,
})

const left = computed(() => props.teams[0] ?? null)
const right = computed(() => props.teams[1] ?? null)
const leftSolid = computed(() => teamColor(left.value?.color).solid)
const rightSolid = computed(() => teamColor(right.value?.color).solid)
const leftSoft = computed(() => teamColor(left.value?.color).soft)
const rightSoft = computed(() => teamColor(right.value?.color).soft)
const numBars = computed(() => props.results.length * 2)

// Projected points = in-progress matches each side currently leads (net holes won),
// derived from hole_results. Finished matches are already in the teams' points totals.
const projected = computed(() => {
  const lid = left.value?.id
  const rid = right.value?.id
  let l = 0
  let r = 0
  for (const m of props.results) {
    if (m.finished) continue
    const lw = m.hole_results.filter((h) => h === lid).length
    const rw = m.hole_results.filter((h) => h === rid).length
    if (lw > rw) l++
    else if (rw > lw) r++
  }
  return { l, r }
})

function blockClass(i: number): string {
  const lS = (left.value?.points ?? 0) * 2 // decided (solid) bars, from the left
  const lT = projected.value.l * 2 // projected (soft) bars
  const rS = (right.value?.points ?? 0) * 2 // decided, from the right
  const rT = projected.value.r * 2
  const n = numBars.value
  if (i <= lS) return leftSolid.value
  if (i <= lS + lT) return leftSoft.value
  if (i > n - rS) return rightSolid.value
  if (i > n - rS - rT) return rightSoft.value
  return 'bg-mrc-line'
}
function borderClass(i: number): string {
  if (i === props.results.length) return 'border-r-2 border-mrc-ink' // midline between the sides
  if (i % 2 === 0) return 'border-r border-white/40' // per-match separators
  return ''
}

function fmt(pts: number | undefined) {
  const p = pts ?? 0
  return { whole: Math.trunc(p), half: p % 1 !== 0 }
}
const leftScore = computed(() => fmt(left.value?.points))
const rightScore = computed(() => fmt(right.value?.points))
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
        <div class="flex items-baseline leading-none tracking-tight">
          <span class="text-6xl">{{ leftScore.whole }}</span>
          <span v-if="leftScore.half" class="text-3xl md:text-4xl">½</span>
        </div>
        <div class="flex items-baseline leading-none tracking-tight">
          <span class="text-6xl">{{ rightScore.whole }}</span>
          <span v-if="rightScore.half" class="text-3xl md:text-4xl">½</span>
        </div>
      </div>
    </div>
  </div>
</template>
