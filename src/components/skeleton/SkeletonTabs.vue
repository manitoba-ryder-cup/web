<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

// Pass the count where the page knows it: placeholders at thirds snapping to halves is the
// jump this exists to avoid. Here, not above the root: that makes it multi-root.
withDefaults(defineProps<{ tabs?: number }>(), { tabs: 3 })
</script>
<template>
  <div class="flex shadow-md" data-testid="skeleton">
    <div v-for="n in tabs" :key="n" data-tab class="flex flex-grow justify-center border-b-4 border-transparent pb-3 pt-5">
      <SkeletonBlock class="h-4 w-20" />
    </div>
  </div>
</template>
