<script setup lang="ts">
// Breaks its content out of the page body's padding so it spans the full content
// column. The negative margins mirror ContentContainer's `px-4` (and, with flushTop,
// PageLayout's `py-8` top) — keep them in sync if that padding ever changes.
withDefaults(defineProps<{ flushTop?: boolean }>(), { flushTop: false })
</script>
<template>
  <div class="-mx-4" :class="flushTop ? '-mt-8' : ''"><slot /></div>
</template>
