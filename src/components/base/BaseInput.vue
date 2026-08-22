<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: string; type?: string; invalid?: boolean }>(), { modelValue: '', type: 'text', invalid: false })
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
<template>
  <!-- Explicit, or a phone in dark mode paints the UA's own dark field and the input reads
       as transparent against the login hero. -->
  <input
    :type="type"
    :value="modelValue"
    class="block w-full rounded border bg-white px-3 py-2 text-mrc-ink shadow-sm [color-scheme:light]"
    :class="invalid ? 'border-mrc-red-team' : 'border-mrc-line-strong'"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
