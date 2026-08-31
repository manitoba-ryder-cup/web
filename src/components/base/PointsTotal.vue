<script setup lang="ts">
import { computed } from 'vue'
import { splitPoints } from '@/lib/points'

// Numerals are data, so they take the body face rather than the display one. A half point is a
// fraction of a point rather than the digit after it, which is why it carries its own mark.
const props = withDefaults(defineProps<{ points: number | undefined; size?: 'md' | 'lg' }>(), { size: 'md' })

const SIZES = {
  md: { whole: 'text-6xl', half: 'text-3xl md:text-4xl' },
  lg: { whole: 'text-7xl', half: 'text-4xl' },
}

const score = computed(() => splitPoints(props.points))
const sizing = computed(() => SIZES[props.size])
</script>
<template>
  <span class="inline-flex items-center gap-1 font-body leading-none tracking-tight tabular-nums">
    <span :class="sizing.whole">{{ score.whole }}</span>
    <span v-if="score.half" class="mt-1" :class="sizing.half">½</span>
  </span>
</template>
