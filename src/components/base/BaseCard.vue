<script setup lang="ts">
import { useSlots } from 'vue'
const slots = useSlots()
</script>
<template>
  <div class="rounded-md overflow-hidden border border-mrc-line shadow w-full bg-mrc-surface">
    <div v-if="slots.image"><slot name="image" /></div>
    <div class="p-4"><slot /></div>
  </div>
</template>
