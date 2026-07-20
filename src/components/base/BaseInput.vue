<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: string; type?: string; invalid?: boolean }>(), { modelValue: '', type: 'text', invalid: false })
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
<template>
  <input :type="type" :value="modelValue"
         class="block w-full rounded border px-3 py-2 shadow-sm"
         :class="invalid ? 'border-mrc-red-team' : 'border-mrc-line-strong'"
         @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
</template>
