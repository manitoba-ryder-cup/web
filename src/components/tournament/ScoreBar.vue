<script setup lang="ts">
import { computed } from 'vue'

// Two bars per match (each bar = ½ a point) so halved matches paint cleanly.
// blue earned grows from the LEFT, red earned from the RIGHT, undecided stays grey,
// and projected points (from in-progress matches) sit just inside each earned block
// in a lighter tint. Teams are identified by their totals on the ends, never by color name.
const props = withDefaults(defineProps<{
  matchCount: number
  bluePoints: number
  redPoints: number
  projectedBlue?: number
  projectedRed?: number
}>(), { projectedBlue: 0, projectedRed: 0 })

const numBars = computed(() => props.matchCount * 2)

function blockClass(i: number): string {
  const blue = props.bluePoints * 2
  const projBlue = props.projectedBlue * 2 + blue
  const red = props.redPoints * 2
  const projRed = props.projectedRed * 2 + red
  const n = numBars.value
  if (i <= blue) return 'bg-mrc-blue-team'
  if (i <= projBlue) return 'bg-mrc-blue-soft'
  if (i <= n - projRed) return 'bg-mrc-line'
  if (i <= n - red) return 'bg-mrc-red-soft'
  return 'bg-mrc-red-team'
}

function borderClass(i: number): string {
  if (i === props.matchCount) return 'border-r-2 border-mrc-ink' // midline between the two sides
  if (i % 2 === 0) return 'border-r border-white/40' // per-match separators
  return ''
}

const blueWhole = computed(() => Math.trunc(props.bluePoints))
const blueHalf = computed(() => props.bluePoints % 1 !== 0)
const redWhole = computed(() => Math.trunc(props.redPoints))
const redHalf = computed(() => props.redPoints % 1 !== 0)
</script>
<template>
  <div class="sticky top-0 z-10 border-b border-mrc-line-strong bg-mrc-surface shadow">
    <div class="relative min-h-20">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${numBars}, minmax(0, 1fr))` }">
        <div v-for="i in numBars" :key="i" class="h-20" :class="[blockClass(i), borderClass(i)]" />
      </div>
      <div class="absolute inset-0 flex items-center justify-between px-3 font-semibold text-white">
        <div class="flex items-baseline leading-none tracking-tighter">
          <span class="text-6xl tracking-tight">{{ blueWhole }}</span>
          <span v-if="blueHalf" class="text-3xl md:text-4xl">½</span>
        </div>
        <div class="flex items-baseline leading-none tracking-tighter">
          <span class="text-6xl tracking-tight">{{ redWhole }}</span>
          <span v-if="redHalf" class="text-3xl md:text-4xl">½</span>
        </div>
      </div>
    </div>
  </div>
</template>
