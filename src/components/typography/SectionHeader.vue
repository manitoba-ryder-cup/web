<script setup lang="ts">
import { useSlots } from 'vue'
const slots = useSlots()
</script>
<template>
  <div>
    <h3 class="font-display font-bold text-xl uppercase tracking-wide"><slot /></h3>
    <p v-if="slots.subheader" class="text-sm text-mrc-muted"><slot name="subheader" /></p>
  </div>
</template>
