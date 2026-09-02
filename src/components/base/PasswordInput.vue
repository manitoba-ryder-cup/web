<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from './BaseInput.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'

defineProps<{ modelValue?: string; placeholder?: string }>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const revealed = ref(false)
</script>
<template>
  <div class="relative">
    <!-- pr-11 is the button's own width (px-3 + w-5), both in rem, so the text stops exactly
         where the button starts at any root font-size. Change one and change the other. -->
    <BaseInput
      :model-value="modelValue"
      :type="revealed ? 'text' : 'password'"
      :placeholder="placeholder"
      class="pr-11"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <!-- The label names the action rather than the state: a masked field cannot show which
         it is, so "Show password" is what a screen reader needs to hear. -->
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-mrc-muted hover:text-mrc-ink"
      :aria-label="revealed ? 'Hide password' : 'Show password'"
      @click="revealed = !revealed"
    >
      <EyeOffIcon v-if="revealed" />
      <EyeIcon v-else />
    </button>
  </div>
</template>
