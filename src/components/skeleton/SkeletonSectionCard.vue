<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

// Reproduces the band rather than composing SectionCard, which needs the title this does not
// know — so py-2.5 around an h-6 matches the real h6's 2.75rem by hand, or the card jumps.
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
