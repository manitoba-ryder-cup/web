<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

// Reproduces SectionCard's band rather than composing the component, which requires a
// `title` — and the title is exactly what's unknown here. That means the geometry has to be
// kept in step by hand: py-2.5 around an h-6 line box is the same 2.75rem as the real h6,
// so the card doesn't change height when it lands. Only the unknown parts pulse; a pulsing
// structural band reads as a bug.
//
// Comment placed here, not above the root: a leading template comment makes the component
// multi-root and silently breaks attribute fallthrough.
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>
<template>
  <div class="overflow-hidden rounded-md border border-mrc-line bg-white" data-testid="skeleton">
    <div data-band class="bg-mrc-muted py-2.5">
      <div class="flex h-6 items-center justify-center">
        <SkeletonBlock tone="inverse" class="h-3.5 w-32" />
      </div>
    </div>
    <div class="space-y-3 p-4">
      <SkeletonBlock v-for="n in rows" :key="n" data-row class="h-4" />
    </div>
  </div>
</template>
