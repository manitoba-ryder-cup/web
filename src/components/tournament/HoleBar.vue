<script setup lang="ts">
import type { Hole } from '@/api/types'
import FlagIcon from '@/components/icons/FlagIcon.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'

defineProps<{ hole: number; info: Hole; prev: number | null; next: number | null }>()
const emit = defineEmits<{ go: [hole: number] }>()

// aria-disabled, not disabled: a dead chevron keeps its place in the tab order, and only its
// glyph fades — so focus neither jumps to the body nor lands somewhere invisible.
const chevron =
  'group flex min-w-[44px] shrink-0 items-center justify-center text-mrc-charcoal transition hover:bg-mrc-panel-alt hover:text-mrc-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mrc-accent aria-disabled:pointer-events-none'

function go(hole: number | null) {
  if (hole !== null) emit('go', hole)
}
</script>
<template>
  <!-- Full height rather than a glyph-sized target: the whole end of the bar is the step. -->
  <div class="flex items-stretch">
    <button type="button" aria-label="Previous hole" :aria-disabled="prev === null" :class="chevron" @click="go(prev)">
      <ChevronRightIcon class="h-8 w-8 rotate-180 group-aria-disabled:opacity-25" />
    </button>
    <div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-6 py-4 text-mrc-muted">
      <span class="flex items-center gap-2 text-3xl font-semibold text-mrc-ink"
        ><FlagIcon /><span class="sr-only">Hole </span>{{ hole }}</span
      >
      <span>Par {{ info.par }}</span>
      <span>{{ info.yards }} Yards</span>
      <span>HDCP {{ info.hdcp }}</span>
    </div>
    <button type="button" aria-label="Next hole" :aria-disabled="next === null" :class="chevron" @click="go(next)">
      <ChevronRightIcon class="h-8 w-8 group-aria-disabled:opacity-25" />
    </button>
  </div>
</template>
