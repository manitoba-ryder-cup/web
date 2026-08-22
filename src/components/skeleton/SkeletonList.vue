<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

// Two shapes because the app has two: separate bordered cards, and one bordered container
// with dividers. A single shape misrepresents half the pages using this.
withDefaults(defineProps<{ rows?: number; card?: boolean }>(), { rows: 5, card: false })
</script>
<template>
  <div v-if="card" class="space-y-3" data-testid="skeleton">
    <div v-for="n in rows" :key="n" data-row class="rounded-md border border-mrc-line bg-mrc-surface p-4 shadow">
      <SkeletonBlock class="h-4 w-1/3" />
      <SkeletonBlock class="mt-2 h-3 w-1/2" />
    </div>
  </div>
  <div v-else class="divide-y divide-mrc-line overflow-hidden rounded-md border border-mrc-line bg-mrc-surface" data-testid="skeleton">
    <div v-for="n in rows" :key="n" data-row class="px-4 py-3">
      <SkeletonBlock class="h-4 w-1/3" />
      <SkeletonBlock class="mt-2 h-3 w-1/2" />
    </div>
  </div>
</template>
