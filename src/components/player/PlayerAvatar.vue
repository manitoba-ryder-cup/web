<script setup lang="ts">
import { ref, watch, computed } from 'vue'
const DEFAULT = '/img/default-avatar.webp'
// 'sm'/'lg' are round avatars; 'card' is a square photo panel that fills a card's edge.
const props = withDefaults(defineProps<{ photoPath?: string; alt?: string; size?: 'sm' | 'lg' | 'card' }>(), {
  photoPath: '',
  alt: '',
  size: 'sm',
})
const src = ref(props.photoPath || DEFAULT)
watch(() => props.photoPath, (p) => { src.value = p || DEFAULT })
// Imported photo paths point at the old server and 404 here → fall back on error.
function onError() { if (src.value !== DEFAULT) src.value = DEFAULT }
const sizeClass = computed(() => {
  switch (props.size) {
    case 'card': return 'h-28 w-28'
    case 'lg': return 'h-24 w-24 rounded-full border border-mrc-line'
    default: return 'h-16 w-16 rounded-full border border-mrc-line'
  }
})
</script>
<template>
  <img :src="src" :alt="alt" @error="onError" :class="sizeClass"
       class="shrink-0 object-cover object-top" />
</template>
