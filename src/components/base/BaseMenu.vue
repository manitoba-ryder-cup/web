<script setup lang="ts">
import { ref, useId, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{ label: string }>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const panelId = useId()
const route = useRoute()

// Anchored in something that survives navigation, so without this it would still be hanging
// open over whatever page the link led to.
watch(
  () => route.fullPath,
  () => (open.value = false),
)

// Closing has to hand the caret back: dismissed with Escape it would otherwise sit on a
// panel that no longer exists, and a keyboard user loses their place on the page.
function close({ restoreFocus = true } = {}) {
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

defineExpose({ close })
</script>
<template>
  <div class="relative">
    <!-- A disclosure, not a menu: the panel holds ordinary links and buttons reached by Tab.
         aria-haspopup would promise arrow-key menu semantics that nothing here implements. -->
    <button
      ref="trigger"
      type="button"
      class="flex min-h-[44px] items-center px-3 text-white/80 hover:text-white"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="open ? close() : (open = true)"
    >
      <slot name="trigger" />
    </button>
    <template v-if="open">
      <!-- A full-screen catcher rather than a document listener: it closes on the tap that
           opens something else, without that tap also reaching what is underneath. -->
      <div data-testid="backdrop" class="fixed inset-0 z-20" @click="close()" />
      <div :id="panelId" class="absolute right-2 z-30 mt-1 w-44 overflow-hidden rounded-md bg-mrc-ink py-1 shadow-lg ring-1 ring-white/15">
        <slot />
      </div>
    </template>
  </div>
</template>
