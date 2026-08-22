<script setup lang="ts">
import CardGrid from '@/components/layout/CardGrid.vue'
import SkeletonBlock from './SkeletonBlock.vue'

// Composes CardGrid rather than repeating its columns, so the skeleton cannot lay out
// differently from what replaces it. Here, not above the root: that makes it multi-root.
withDefaults(defineProps<{ cards?: number }>(), { cards: 6 })
</script>
<template>
  <CardGrid data-testid="skeleton">
    <div v-for="n in cards" :key="n" data-card class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
      <!-- radius none: the card already clips, and a rounded fill would show its own
           corners against the straight edge of the container. -->
      <SkeletonBlock radius="none" class="h-32 w-full" />
      <div class="p-4">
        <SkeletonBlock class="h-4 w-2/3" />
        <SkeletonBlock class="mt-2 h-3 w-1/2" />
      </div>
    </div>
  </CardGrid>
</template>
