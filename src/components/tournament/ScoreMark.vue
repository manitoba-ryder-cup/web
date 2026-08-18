<script setup lang="ts">
import { computed } from 'vue'

// Standard scorecard notation around a hole score, relative to par:
//   birdie (−1) → circle, eagle or better (≤ −2) → double circle,
//   bogey (+1) → square, double bogey or worse (≥ +2) → double square, par → nothing.
// Rings are absolutely positioned and overhang the box, so a bigger mark never changes the
// row height, and border-current makes them match the digit's colour.
const props = defineProps<{ score: number | null; par: number | null }>()

type Ring = 'circle' | 'square' | null
const mark = computed<{ ring: Ring; double: boolean }>(() => {
  const { score, par } = props
  if (score == null || par == null) return { ring: null, double: false }
  const d = score - par
  if (d <= -2) return { ring: 'circle', double: true }
  if (d === -1) return { ring: 'circle', double: false }
  if (d === 1) return { ring: 'square', double: false }
  if (d >= 2) return { ring: 'square', double: true }
  return { ring: null, double: false }
})
const shape = computed(() => (mark.value.ring === 'square' ? 'rounded-[1px]' : 'rounded-full'))
</script>
<template>
  <template v-if="score == null">–</template>
  <span v-else class="relative inline-flex h-6 w-6 items-center justify-center">
    <span v-if="mark.ring" class="absolute -inset-[3px] border border-current" :class="shape" />
    <span v-if="mark.double" class="absolute inset-0 border border-current" :class="shape" />
    <span class="relative">{{ score }}</span>
  </span>
</template>
