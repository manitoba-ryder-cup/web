<script setup lang="ts">
// The one place that decides what a placeholder looks like. Every other skeleton composes
// this, so changing how "loading" reads is one file rather than eleven views.
withDefaults(defineProps<{ radius?: 'none' | 'sm' | 'md' | 'full'; tone?: 'surface' | 'inverse' }>(), {
  radius: 'sm',
  tone: 'surface',
})

// Radius is a prop rather than a passed class because `rounded` and `rounded-md` set the
// same property: which one wins in a merged :class depends on Tailwind's stylesheet order,
// not on the call site. Width and height stay as passed classes — those never collide.
const RADIUS: Record<string, string> = { none: '', sm: 'rounded', md: 'rounded-md', full: 'rounded-full' }

// Two backgrounds exist in this app. `inverse` covers both dark ones — the crowd photo
// behind the dashboard hero and SectionCard's header band. Translucent white alone can't
// work over the photo: an alpha that reads over the bright fairway is invisible over the
// dark stands, and a full-width bar spans both. The blur flattens the backdrop into a
// single tone, and the alpha stays high enough to read where backdrop-filter doesn't apply.
const TONE: Record<string, string> = { surface: 'bg-mrc-line', inverse: 'bg-white/30 backdrop-blur-md' }
</script>
<template>
  <div aria-hidden="true" class="animate-pulse motion-reduce:animate-none" :class="[RADIUS[radius], TONE[tone]]" />
</template>
