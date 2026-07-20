<script setup lang="ts">
withDefaults(defineProps<{ required?: boolean }>(), { required: false })
</script>
<template>
  <label class="mb-1 block text-mrc-muted"><slot /><span v-if="required" class="text-mrc-red-team"> *</span></label>
</template>
