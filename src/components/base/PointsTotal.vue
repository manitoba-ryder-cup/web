<script setup lang="ts">
import { computed } from 'vue'
import { splitPoints } from '@/lib/points'

const props = withDefaults(defineProps<{ points: number | undefined; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const SIZES = {
  sm: { whole: 'text-3xl', half: 'text-base' },
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
