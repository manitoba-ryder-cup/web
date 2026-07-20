<script setup lang="ts">
import BaseAlert from '@/components/base/BaseAlert.vue'
withDefaults(defineProps<{ loading: boolean; error: string; empty?: boolean; emptyText?: string }>(), {
  empty: false,
  emptyText: 'Nothing here yet.',
})
</script>
<template>
  <p v-if="loading" class="text-mrc-muted">Loading…</p>
  <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
  <p v-else-if="empty" class="text-mrc-muted">{{ emptyText }}</p>
  <slot v-else />
</template>
