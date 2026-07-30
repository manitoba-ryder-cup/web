<script setup lang="ts">
import BaseAlert from '@/components/base/BaseAlert.vue'
// `retry` re-runs the load. Optional, so a view with nothing to re-run doesn't render a
// dead button — but pass it where you can: on a phone in the field a dropped request
// otherwise leaves the page stuck until the user thinks to reload it.
withDefaults(defineProps<{ loading: boolean; error: string; empty?: boolean; emptyText?: string; retry?: () => void }>(), {
  empty: false,
  emptyText: 'Nothing here yet.',
  retry: undefined,
})
</script>
<template>
  <!-- The `loading` slot lets a view swap in a skeleton without also re-implementing the
       error/retry half, which is the part worth keeping identical everywhere. -->
  <slot v-if="loading" name="loading"><p class="text-mrc-muted">Loading…</p></slot>
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
