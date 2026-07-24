<script setup lang="ts">
import { computed } from 'vue'
import { tierDot } from '@/lib/tier'

// A small colour dot for a player's skill tier (draft flight). Renders nothing when the
// tier is unset. `size` is 'sm' by default, 'xs' where space is tight (e.g. inside a pill).
const props = withDefaults(defineProps<{ tier?: string; size?: 'sm' | 'xs' }>(), { tier: '', size: 'sm' })
const classes = computed(() => [props.size === 'xs' ? 'h-2 w-2' : 'h-2.5 w-2.5', tierDot(props.tier)])
</script>
<template>
  <span v-if="tier" class="shrink-0 rounded-full" :class="classes" />
</template>
