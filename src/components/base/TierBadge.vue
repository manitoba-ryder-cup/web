<script setup lang="ts">
import { computed } from 'vue'
import { tierBadge } from '@/lib/tier'

// The label is the tier itself, not passed in: callers gave one page "GOLD" and another
// "GOLD FLIGHT". Renders nothing when unset so callers need no v-if.
const props = withDefaults(defineProps<{ tier?: string }>(), { tier: '' })
const classes = computed(() => tierBadge(props.tier))
</script>
<template>
  <span v-if="tier" class="inline-block rounded-full px-2 text-xs font-semibold uppercase tracking-wider shadow" :class="classes">
    {{ tier }}
  </span>
</template>
