<script setup lang="ts">
import { useSlots } from 'vue'
const slots = useSlots()
</script>
<template>
  <div>
    <h4 class="uppercase tracking-wide"><slot /></h4>
    <p v-if="slots.subheader" class="text-sm text-mrc-muted"><slot name="subheader" /></p>
  </div>
</template>
