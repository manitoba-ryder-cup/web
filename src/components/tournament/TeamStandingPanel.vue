<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ color: 'Red' | 'Blue'; captain: string; points: number }>()
const colorClass = computed(() => (props.color === 'Red' ? 'text-mrc-red-team' : 'text-mrc-blue-team'))
</script>
<template>
  <div :class="color === 'Red' ? 'text-right' : ''">
    <h4 class="font-display font-semibold" :class="colorClass">{{ color }}</h4>
    <p class="text-sm text-mrc-muted">{{ captain }}</p>
    <p class="text-6xl font-semibold tracking-tighter" :class="colorClass">{{ points }}</p>
  </div>
</template>
