<script setup lang="ts">
withDefaults(defineProps<{ image?: string; above?: string; below?: string }>(), {
  image: '/img/ocean-flag.webp',
  above: '',
  below: '',
})
</script>
<template>
  <div class="flex h-36 flex-col items-center justify-center bg-cover bg-bottom px-2 text-center md:h-72"
       :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('${image}')` }">
    <p v-if="above" class="text-base text-white md:text-lg mb-2">{{ above }}</p>
    <h1 class="text-white"><slot /></h1>
    <p v-if="below" class="text-base text-white md:text-lg mt-2">{{ below }}</p>
  </div>
</template>
