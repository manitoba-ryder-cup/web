<script setup lang="ts">
// Small caps: eyebrows, stat captions, and the section labels inside a panel. What makes
// it a label — uppercase, the weight, the letterspacing — lives here so it reads the same
// everywhere instead of being re-typed slightly differently at each site.
//
// Size is a prop, not a class, because a caller's `text-sm` and this component's `text-xs`
// are utilities of equal specificity: which one wins is decided by their order in the
// generated stylesheet, not by the caller. Colour is left to the caller and never set
// here, so there is nothing for it to collide with.
//
// `as` because these are sometimes a heading and sometimes a caption, and the tag should
// say which rather than everything being a <p>.
withDefaults(defineProps<{ as?: string; size?: 'xs' | 'sm' }>(), { as: 'p', size: 'xs' })
</script>
<template>
  <component :is="as" class="font-semibold uppercase tracking-widest" :class="size === 'sm' ? 'text-sm' : 'text-xs'">
    <slot />
  </component>
</template>
