<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'

// The signature standings bar. Two bars per match (each = ½ a point) so halved matches
// paint cleanly. The first team grows from the LEFT in its colour, the second from the
// RIGHT in its colour; undecided stays grey. Order and colour come from the caller —
// no colour is named here. Each team's total sits on its end.
const props = defineProps<{ matchCount: number; teams: TournamentTeam[] }>()

const left = computed(() => props.teams[0] ?? null)
const right = computed(() => props.teams[1] ?? null)
const leftSolid = computed(() => teamColor(left.value?.color).solid)
const rightSolid = computed(() => teamColor(right.value?.color).solid)
const numBars = computed(() => props.matchCount * 2)

function blockClass(i: number): string {
  const l = (left.value?.points ?? 0) * 2
  const r = (right.value?.points ?? 0) * 2
  const n = numBars.value
  if (i <= l) return leftSolid.value
  if (i > n - r) return rightSolid.value
  return 'bg-mrc-line'
}
function borderClass(i: number): string {
  if (i === props.matchCount) return 'border-r-2 border-mrc-ink' // midline between the sides
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
  <div class="sticky top-0 z-10 border-b border-mrc-line-strong bg-mrc-surface shadow">
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
