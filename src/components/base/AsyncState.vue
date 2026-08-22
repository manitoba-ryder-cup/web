<script setup lang="ts">
import BaseAlert from '@/components/base/BaseAlert.vue'
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
  <div v-else-if="error">
    <BaseAlert variant="error">{{ error }}</BaseAlert>
    <button
      v-if="retry"
      type="button"
      class="mt-3 w-full rounded-md bg-mrc-accent py-3 font-semibold text-white transition hover:bg-mrc-accent-dark"
      @click="retry"
    >
      Try again
    </button>
  </div>
  <p v-else-if="empty" class="text-mrc-muted">{{ emptyText }}</p>
  <slot v-else />
</template>
