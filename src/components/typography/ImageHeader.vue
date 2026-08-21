<script setup lang="ts">
import CapsLabel from './CapsLabel.vue'

// `above` is the eyebrow naming the cup — "2026 · Buffalo Point" — so it takes the small
// caps the dashboard and the scores page give the same line. `below` is a line of prose
// under the title and stays set as prose.
withDefaults(defineProps<{ image?: string; above?: string; below?: string }>(), {
  image: '/img/ocean-flag.webp',
  above: '',
  below: '',
})
</script>
<template>
  <div
    class="flex h-36 flex-col items-center justify-center bg-cover bg-bottom px-2 text-center md:h-72"
    :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('${image}')` }"
  >
    <!-- `hero` replaces the whole title block for rich content (e.g. a coloured matchup). -->
    <slot name="hero">
      <CapsLabel v-if="above" size="sm" class="mb-3 text-white/80">{{ above }}</CapsLabel>
      <h1 class="text-white"><slot /></h1>
      <p v-if="below" class="text-base text-white md:text-lg mt-2">{{ below }}</p>
    </slot>
  </div>
</template>
