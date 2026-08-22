<script setup lang="ts">
import { useToasts } from '@/composables/useToast'
const { toasts, dismiss } = useToasts()
</script>
<template>
  <!-- Held clear of the tab bar below md, where the bar owns the bottom of the screen. -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-4"
    aria-live="polite"
    aria-atomic="true"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
      leave-to-class="opacity-0"
    >
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        @click="dismiss(t.id)"
        class="pointer-events-auto max-w-sm rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg"
        :class="t.variant === 'success' ? 'bg-mrc-success' : 'bg-mrc-red-team'"
      >
        {{ t.message }}
      </button>
    </TransitionGroup>
  </div>
</template>
