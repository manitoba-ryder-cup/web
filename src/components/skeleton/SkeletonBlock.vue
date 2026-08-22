<script setup lang="ts">
// The one place that decides what a placeholder looks like. Every other skeleton composes
// this, so changing how "loading" reads is one file rather than eleven views.
withDefaults(defineProps<{ radius?: 'none' | 'sm' | 'md' | 'full'; tone?: 'surface' | 'inverse' }>(), {
  radius: 'sm',
  tone: 'surface',
})

// A prop, because `rounded` and `rounded-md` set the same property and which wins in a
// merged :class depends on stylesheet order, not the call site.
const RADIUS: Record<string, string> = { none: '', sm: 'rounded', md: 'rounded-md', full: 'rounded-full' }

// Translucent white alone cannot span the crowd photo: an alpha that reads over the bright
// fairway is invisible over the dark stands. The blur flattens it to one tone.
const TONE: Record<string, string> = { surface: 'bg-mrc-line', inverse: 'bg-white/30 backdrop-blur-md' }
</script>
<template>
  <div aria-hidden="true" class="animate-pulse motion-reduce:animate-none" :class="[RADIUS[radius], TONE[tone]]" />
</template>
