<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ variant?: 'success' | 'error' | 'info' | 'warning' }>(), { variant: 'info' })
const classes = computed(() => {
  const map = {
    success: 'bg-mrc-success-tint text-mrc-success-ink',
    error: 'bg-mrc-red-line text-mrc-red-strong',
    info: 'bg-mrc-blue-line text-mrc-blue-strong',
    warning: 'bg-mrc-warning-tint text-mrc-warning-ink',
  }
  return map[props.variant]
})
</script>
<template>
  <div class="flex items-center py-3 px-4 rounded shadow-sm text-sm" :class="classes"><slot /></div>
</template>
