<script setup lang="ts">
import RetryNotice from '@/components/base/RetryNotice.vue'
// Optional so a view with nothing to re-run doesn't render a dead button — but pass it
// where you can: on a phone in a field, a dropped request otherwise needs a reload.
withDefaults(defineProps<{ loading: boolean; error: string; empty?: boolean; emptyText?: string; retry?: () => void }>(), {
  empty: false,
  emptyText: 'Nothing here yet.',
  retry: undefined,
})
</script>
<template>
  <!-- A skeleton is aria-hidden by construction, so the announcement lives here rather
       than in the slot, where swapping one in would silently remove it. -->
  <template v-if="loading">
    <span class="sr-only" role="status">Loading…</span>
    <slot name="loading"><p class="text-mrc-muted" aria-hidden="true">Loading…</p></slot>
  </template>
  <RetryNotice v-else-if="error" :message="error" :retry="retry" />
  <p v-else-if="empty" class="text-mrc-muted">{{ emptyText }}</p>
  <slot v-else />
</template>
