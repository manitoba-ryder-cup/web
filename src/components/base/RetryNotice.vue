<script setup lang="ts">
import BaseAlert from '@/components/base/BaseAlert.vue'
// The one shape a failed request takes: what went wrong, and a way to ask again. The floor is
// in px, not rem: the base font-size is 14px on a phone, so a rem one would shrink below 44.
withDefaults(defineProps<{ message: string; retry?: () => void }>(), { retry: undefined })
</script>
<template>
  <div>
    <BaseAlert variant="error">{{ message }}</BaseAlert>
    <button
      v-if="retry"
      type="button"
      class="mt-3 min-h-[44px] w-full rounded-md bg-mrc-accent py-3 font-semibold text-white transition hover:bg-mrc-accent-dark"
      @click="retry"
    >
      Try again
    </button>
  </div>
</template>
