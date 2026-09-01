<script setup lang="ts">
import { computed } from 'vue'
import { splitPoints } from '@/lib/points'

const props = withDefaults(defineProps<{ points: number | undefined; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

// Set against the whole rather than proportionally: half of the small numeral is the size of the
// label under it. Its gap is optical — ½ has a narrow left bearing and crowds a digit set to metric.
const SIZES = {
  sm: { whole: 'text-3xl', half: 'text-3xl', gap: 'gap-0.5' },
  md: { whole: 'text-6xl', half: 'mt-1 text-3xl md:text-4xl', gap: 'gap-1' },
  lg: { whole: 'text-7xl', half: 'mt-1 text-4xl', gap: 'gap-1' },
}

const score = computed(() => splitPoints(props.points))
const sizing = computed(() => SIZES[props.size])
</script>
<template>
  <span class="inline-flex items-center font-body leading-none tracking-tight tabular-nums" :class="sizing.gap">
    <span :class="sizing.whole">{{ score.whole }}</span>
    <span v-if="score.half" :class="sizing.half">½</span>
  </span>
</template>
