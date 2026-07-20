<script setup lang="ts">
withDefaults(defineProps<{ image?: string }>(), { image: '/img/ocean-flag.webp' })
</script>
<template>
  <div class="flex items-center justify-center h-36 md:h-72 px-2 text-center bg-cover bg-bottom"
       :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('${image}')` }">
    <h1 class="font-display font-bold text-white text-4xl md:text-5xl"><slot /></h1>
  </div>
</template>
