<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ bluePoints: number; redPoints: number }>()
const bluePct = computed(() => {
  const total = props.bluePoints + props.redPoints
  return total === 0 ? 50 : (props.bluePoints / total) * 100
})
</script>
<template>
  <!-- Non-div root so `find('div > div')` in tests resolves to the blue fill:
       @vue/test-utils mounts into a container <div>, so a div root would
       itself match `div > div` and shadow the descendant fills. -->
  <section class="block">
    <div class="flex h-3 w-full overflow-hidden rounded">
      <div class="h-full bg-mrc-blue-team" :style="{ width: `${bluePct}%` }" />
      <div class="h-full flex-1 bg-mrc-red-team" />
    </div>
  </section>
</template>
