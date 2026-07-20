<script setup lang="ts">
import { ref, watch, computed } from 'vue'
const DEFAULT = '/img/default-avatar.webp'
const props = withDefaults(defineProps<{ photoPath?: string; alt?: string; size?: 'sm' | 'lg' }>(), {
  photoPath: '',
  alt: '',
  size: 'sm',
})
const src = ref(props.photoPath || DEFAULT)
watch(() => props.photoPath, (p) => { src.value = p || DEFAULT })
// Imported photo paths point at the old server and 404 here → fall back on error.
function onError() { if (src.value !== DEFAULT) src.value = DEFAULT }
const sizeClass = computed(() => (props.size === 'lg' ? 'h-24 w-24' : 'h-16 w-16'))
</script>
<template>
  <img :src="src" :alt="alt" @error="onError" :class="sizeClass"
       class="shrink-0 rounded-full border border-mrc-line object-cover object-top" />
</template>
