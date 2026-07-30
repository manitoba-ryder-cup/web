<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

// Mirrors BaseTabs' bar: equal-width labels over a 4px bottom border, so the tab strip
// doesn't jump height when the real one arrives. Three labels, because the real count is
// unknown while loading and three is the common case here.
//
// Comment placed here, not above the root: a leading template comment makes the component
// multi-root and silently breaks attribute fallthrough.
</script>
<template>
  <div class="flex shadow-md" data-testid="skeleton">
    <div v-for="n in 3" :key="n" data-tab class="flex flex-grow justify-center border-b-4 border-transparent pb-3 pt-5">
      <SkeletonBlock class="h-4 w-20" />
    </div>
  </div>
</template>
