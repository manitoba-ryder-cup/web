<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import XIcon from '@/components/icons/XIcon.vue'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const route = useRoute()

// Close whenever navigation happens
watch(() => route.fullPath, () => emit('close'))

// Esc closes, only while open (listener attached/detached with open state)
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
watch(() => props.open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
// Fallback so the listener never outlives the component if it unmounts while open
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <div>
    <div v-if="open" class="fixed inset-0 z-10 bg-black/50" @click="emit('close')" />
    <aside class="fixed right-0 top-0 z-20 h-screen w-80 transform bg-mrc-ink text-white transition-transform duration-300 ease-in-out"
           :class="open ? 'translate-x-0' : 'translate-x-full'">
      <div class="flex items-center justify-between bg-mrc-accent/75 px-4 pb-3 pt-4">
        <span class="text-sm font-semibold tracking-wide">Manitoba Ryder Cup</span>
        <button type="button" aria-label="Close menu" @click="emit('close')"><XIcon /></button>
      </div>
      <nav class="mt-2"><slot /></nav>
    </aside>
  </div>
</template>
