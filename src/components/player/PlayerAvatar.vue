<script setup lang="ts">
import { ref, watch } from 'vue'
const DEFAULT = '/img/default-avatar.webp'
const props = withDefaults(defineProps<{ photoPath?: string; alt?: string }>(), { photoPath: '', alt: '' })
const src = ref(props.photoPath || DEFAULT)
watch(() => props.photoPath, (p) => { src.value = p || DEFAULT })
// Imported photo paths point at the old server and 404 here → fall back on error.
function onError() { if (src.value !== DEFAULT) src.value = DEFAULT }
</script>
<template>
  <img :src="src" :alt="alt" @error="onError" />
</template>
