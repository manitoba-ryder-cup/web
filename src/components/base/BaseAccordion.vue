<script setup lang="ts">
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'

// A disclosure row: a header that stays put and a panel that opens beneath it. When open
// the header is the panel's heading rather than a peer of it, so it keeps its weight and
// takes a shadowed edge to separate the two.
//
// Whoever renders a list of these owns which is open, so the list can enforce one at a
// time rather than each row deciding for itself. `itemId` is what the anchor is built
// from, so a row can be linked to and scrolled to — see useHashAccordion, which is the
// other half of this.
defineProps<{ open: boolean; itemId: string }>()
defineEmits<{ toggle: [] }>()
</script>
<template>
  <!-- -mx-4 so the divider between rows runs past the text to the screen edge rather than
       stopping at the content column. -->
  <div :id="`accordion-${itemId}`" class="-mx-4 border-b border-mrc-line">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition"
      :class="open ? 'relative z-10 border-b border-mrc-line shadow-md' : 'hover:bg-mrc-panel'"
      :aria-expanded="open"
      :aria-controls="`accordion-panel-${itemId}`"
      @click="$emit('toggle')"
    >
      <div class="min-w-0"><slot name="header" /></div>
      <!-- Trailing detail sits beside the chevron, which the row owns so every accordion
           turns the same way. -->
      <div class="flex shrink-0 items-center gap-3">
        <slot name="meta" />
        <ChevronRightIcon class="text-mrc-faint transition" :class="open ? 'rotate-90' : ''" />
      </div>
    </button>

    <div v-if="open" :id="`accordion-panel-${itemId}`" class="bg-mrc-panel px-4 pb-6 pt-5">
      <slot />
    </div>
  </div>
</template>
