<script setup lang="ts">
import { computed } from 'vue'
import { tierBadge } from '@/lib/tier'

// A player's tier as a coloured pill. The label is the tier itself and is not passed in:
// when callers supplied it, one page read "GOLD" and another "GOLD FLIGHT". Renders
// nothing when the tier is unset, so callers don't each need a v-if.
const props = withDefaults(defineProps<{ tier?: string }>(), { tier: '' })
const classes = computed(() => tierBadge(props.tier))
</script>
<template>
  <span v-if="tier" class="inline-block rounded-full px-2 text-xs font-semibold uppercase tracking-wider shadow" :class="classes">
    {{ tier }}
  </span>
</template>
