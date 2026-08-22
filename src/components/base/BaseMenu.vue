<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{ label: string; align?: 'left' | 'right' }>()

const open = ref(false)
const route = useRoute()

// Anchored in something that survives navigation, so without this it would still be hanging
// open over whatever page the link led to.
watch(
  () => route.fullPath,
  () => (open.value = false),
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

defineExpose({ close: () => (open.value = false) })
</script>
<template>
  <div class="relative">
    <button
      type="button"
      class="flex min-h-[44px] items-center px-3 text-white/80 hover:text-white"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <slot name="trigger" />
    </button>
    <template v-if="open">
      <!-- A full-screen catcher rather than a document listener: it closes on the tap that
           opens something else, without that tap also reaching what is underneath. -->
      <div data-testid="backdrop" class="fixed inset-0 z-20" @click="open = false" />
      <div
        class="absolute z-30 mt-1 w-44 overflow-hidden rounded-md bg-mrc-ink py-1 shadow-lg ring-1 ring-white/15"
        :class="align === 'left' ? 'left-2' : 'right-2'"
      >
        <slot />
      </div>
    </template>
  </div>
</template>
