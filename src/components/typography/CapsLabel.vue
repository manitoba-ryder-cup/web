<script setup lang="ts">
// Size is a prop, not a class: a caller's text-sm and this component's text-xs are utilities
// of equal specificity, so stylesheet order decides, not the call site. Colour is the caller's.
withDefaults(defineProps<{ as?: string; size?: 'xs' | 'sm' }>(), { as: 'p', size: 'xs' })
</script>
<template>
  <component :is="as" class="font-semibold uppercase tracking-widest" :class="size === 'sm' ? 'text-sm' : 'text-xs'">
    <slot />
  </component>
</template>
