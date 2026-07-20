<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ tier: string }>()
const classes = computed(() => {
  const map: Record<string, string> = {
    white: 'bg-white border border-mrc-line-strong text-mrc-ink',
    blue: 'bg-mrc-blue-team text-white',
    black: 'bg-mrc-ink text-white',
    silver: 'bg-mrc-faint text-white',
    gold: 'bg-mrc-gold text-white',
  }
  return map[props.tier] ?? map.white
})
</script>
<template>
  <span class="inline-block uppercase tracking-wider px-2 rounded-full text-xs font-semibold shadow" :class="classes"><slot /></span>
</template>
