<script setup lang="ts">
import { computed, onMounted, nextTick, watch, ref } from 'vue'

// One player's strokes for one hole: a strip of numbered tiles pinned to par, with the
// chosen one filled. Par sits in the same place in every player's strip, so the fill's
// position is the score against par and a hole reads down the column — the low score is
// the leftmost fill, before you have read a number.
//
// The strip never moves itself. Choosing fills a tile where it already sits rather than
// sliding it to the middle, which means scrolling cannot select either: the tile in the
// middle is not the answer to anything. That is deliberate — the control this replaced
// read whatever the scroll centred, so a stray drag or a focus could record a score
// nobody picked.
//
// priorStrokes/priorPar are the round before this hole, so the readout is a running total
// that follows the strip: you see what the score you are about to record does to the
// round, not just the hole. Default 0/0 reads as this hole alone.
const props = withDefaults(
  defineProps<{
    modelValue: number
    par: number
    name: string
    readonly?: boolean
    unscored?: boolean
    priorStrokes?: number
    priorPar?: number
  }>(),
  { readonly: false, unscored: false, priorStrokes: 0, priorPar: 0 },
)
const emit = defineEmits<{ 'update:modelValue': [strokes: number] }>()

const MAX = 20
const strokes = Array.from({ length: MAX }, (_, i) => i + 1)
const track = ref<HTMLElement | null>(null)

// An unscored hole adds nothing to either side of the comparison — the strip sits on par
// but that par was never made — so the readout is the round as it stood before it.
const total = computed(() => props.priorStrokes + (props.unscored ? 0 : props.modelValue))
const rel = computed(() => {
  const d = total.value - (props.priorPar + (props.unscored ? 0 : props.par))
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
})

// Named as far as the game names them and a tile holds the word: "Quadruple" overruns and
// is 0.2% of scores, so past triple the number says it.
const OVER = ['Bogey', 'Double', 'Triple']
function term(s: number): string {
  if (s === 1) return 'Ace'
  const d = s - props.par
  if (d === -3) return 'Albatross'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0) return 'Par'
  return OVER[d - 1] ?? `+${d}`
}

function tileAt(s: number): HTMLElement | undefined {
  return track.value?.querySelectorAll<HTMLElement>('[data-stroke]')[s - 1]
}
// Par centred, because par is what lines the strips up with one another.
function anchor() {
  const el = track.value
  const tile = tileAt(props.par)
  if (!el || !tile) return
  el.scrollLeft = tile.offsetLeft + tile.offsetWidth / 2 - el.clientWidth / 2
}
// Nudged into view, never centred: choosing must not shift the strip under the finger
// that chose, and a score far enough from par to load off-screen still has to be seen.
function reveal(s: number) {
  tileAt(s)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
function select(s: number) {
  if (props.readonly) return
  emit('update:modelValue', s)
}
// One tab stop per player, arrows to move. Reaching a tile is a tap, a deliberate key, or
// scrolling to it — never Tab passing through on its way to Save.
function onKeydown(e: KeyboardEvent) {
  if (props.readonly) return
  const to =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? Math.min(MAX, props.modelValue + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? Math.max(1, props.modelValue - 1)
        : e.key === 'Home'
          ? 1
          : e.key === 'End'
            ? MAX
            : 0
  if (!to) return
  e.preventDefault()
  select(to)
  // preventScroll so the browser's own nudge doesn't fight reveal's.
  nextTick(() => tileAt(to)?.focus({ preventScroll: true }))
}

onMounted(() =>
  nextTick(() => {
    anchor()
    reveal(props.modelValue)
  }),
)
watch(
  () => props.modelValue,
  (v) => reveal(v),
)
</script>
<template>
  <div class="py-4">
    <div class="flex items-baseline justify-between gap-3 px-4">
      <span class="min-w-0 truncate font-display text-2xl font-semibold text-mrc-ink">{{ name }}</span>
      <span class="shrink-0 text-2xl tabular-nums text-mrc-ink">{{ total }} ({{ rel }})</span>
    </div>
    <div
      ref="track"
      role="radiogroup"
      :aria-label="`Strokes for ${name}`"
      @keydown="onKeydown"
      class="mt-3 flex gap-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :class="readonly ? 'overflow-x-hidden' : 'overflow-x-auto'"
    >
      <!-- Half the strip less half a tile at each end, so par can sit centred and the low
           scores are still reachable to its left. -->
      <div class="w-[calc(50%-2.75rem)] shrink-0" />
      <button
        v-for="s in strokes"
        :key="s"
        type="button"
        data-stroke
        role="radio"
        :aria-checked="!unscored && s === modelValue"
        :tabindex="s === modelValue ? 0 : -1"
        :disabled="readonly"
        class="min-h-[76px] w-[5.5rem] shrink-0 rounded-lg px-1 py-2 text-center transition-colors"
        :class="!unscored && s === modelValue ? 'bg-mrc-accent text-white' : 'text-mrc-charcoal'"
        @click="select(s)"
      >
        <span class="block text-5xl font-bold leading-none tabular-nums">{{ s }}</span>
        <span class="mt-1 block truncate text-sm">{{ term(s) }}</span>
      </button>
      <div class="w-[calc(50%-2.75rem)] shrink-0" />
    </div>
  </div>
</template>
