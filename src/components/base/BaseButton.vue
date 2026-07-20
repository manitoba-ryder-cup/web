<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'transparent'
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
}>(), { variant: 'primary', type: 'button', loading: false, disabled: false })

const classes = computed(() => {
  if (props.disabled || props.loading) return 'text-mrc-faint bg-mrc-line cursor-not-allowed'
  const map = {
    primary: 'bg-mrc-accent text-white hover:bg-mrc-accent-dark',
    secondary: 'bg-mrc-line-strong hover:bg-mrc-faint text-mrc-ink',
    transparent: 'bg-transparent text-white border-2 border-white',
  }
  return map[props.variant]
})
</script>
<template>
  <button :type="type" :disabled="disabled || loading"
          class="inline-flex items-center justify-center px-6 py-2 rounded font-semibold shadow-md"
          :class="classes">
    <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <slot />
  </button>
</template>
