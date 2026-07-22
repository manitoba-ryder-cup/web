<script setup lang="ts">
// A titled card: the section label lives in the box's own header band, so heading and
// content read as one object — no floating divider clashing with the border below it.
defineProps<{ title: string; padded?: boolean }>()
</script>
<template>
  <section class="overflow-hidden rounded-md border border-mrc-line bg-white">
    <h2 class="bg-mrc-muted py-2.5 text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
      {{ title }}
    </h2>
    <div :class="padded ? 'p-4' : ''"><slot /></div>
  </section>
</template>
