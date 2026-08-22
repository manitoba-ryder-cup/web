<script setup lang="ts">
// The negative margins mirror ContentContainer's px-4 and, with flushTop, PageLayout's
// pt-4 — keep them in sync if that padding changes.
withDefaults(defineProps<{ flushTop?: boolean }>(), { flushTop: false })
</script>
<template>
  <div class="-mx-4" :class="flushTop ? '-mt-4' : ''"><slot /></div>
</template>
