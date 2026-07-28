<script setup lang="ts">
// A titled card: the section label lives in the box's own header band, so heading and
// content read as one object — no floating divider clashing with the border below it.
defineProps<{ title: string; padded?: boolean }>()
</script>
<template>
  <section class="overflow-hidden rounded-md border border-mrc-line bg-white">
    <!-- h6: the band is a small label, and the level carries the size. -->
    <h6 class="bg-mrc-muted py-2.5 text-center uppercase tracking-[0.2em] text-white">
      {{ title }}
    </h6>
    <div :class="padded ? 'p-4' : ''"><slot /></div>
  </section>
</template>
