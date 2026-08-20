<script setup lang="ts">
import { ref, watch, computed } from 'vue'
const DEFAULT = '/img/default-avatar.webp'
// 'sm'/'lg' are round avatars; 'card' is a square photo panel that fills a card's edge;
// 'hero' is the large round headshot on a dark hero band (a light ring instead of a line).
const props = withDefaults(defineProps<{ photoPath?: string; alt?: string; size?: 'row' | 'sm' | 'lg' | 'card' | 'hero' }>(), {
  photoPath: '',
  alt: '',
  size: 'sm',
})
const src = ref(props.photoPath || DEFAULT)
watch(
  () => props.photoPath,
  (p) => {
    src.value = p || DEFAULT
  },
)
// Imported photo paths point at the old server and 404 here → fall back on error.
function onError() {
  if (src.value !== DEFAULT) src.value = DEFAULT
}
const sizeClass = computed(() => {
  switch (props.size) {
    // Two rows sit side by side on a phone, so this is the one size that has to leave
    // room for a name beside it.
    case 'row':
      return 'h-9 w-9 rounded-full border border-mrc-line'
    case 'card':
      return 'h-28 w-28'
    case 'hero':
      return 'h-28 w-28 md:h-36 md:w-36 rounded-full ring-4 ring-white/80 shadow-xl'
    case 'lg':
      return 'h-24 w-24 rounded-full border border-mrc-line'
    default:
      return 'h-16 w-16 rounded-full border border-mrc-line'
  }
})
</script>
<template>
  <!-- The players page renders the whole roster at once, so avatars load lazily; the
       size classes already reserve the box, so nothing shifts as they arrive. -->
  <img :src="src" :alt="alt" @error="onError" :class="sizeClass" loading="lazy" decoding="async" class="shrink-0 object-cover object-top" />
</template>
