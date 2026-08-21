<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'

// v2's score wheel, reproduced: a horizontal row of big number tiles, each labelled with
// its scoring term; the centred tile is the selection (dark), the rest are quieter — no
// highlight box. The mechanism is rebuilt to measure tile positions from the DOM rather
// than deriving them from screen width.
// `unscored` still centres on modelValue but picks out nothing: a selected par would
// read as a score nobody made.
// priorStrokes/priorPar are the round before this hole, so the readout is a running
// total that follows the wheel — you see what the score you're about to record does to
// the round, not just the hole. Default 0/0 reads as this hole alone.
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
let raf = 0

// An unscored hole adds nothing to either side of the comparison — the wheel sits on par
// but that par was never made — so the readout is the round as it stood before it.
const total = computed(() => props.priorStrokes + (props.unscored ? 0 : props.modelValue))
const rel = computed(() => {
  const d = total.value - (props.priorPar + (props.unscored ? 0 : props.par))
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
})
const OVER = ['Bogey', 'Double Bogey', 'Triple Bogey', 'Quadruple Bogey']
function term(s: number): string {
  if (s === 1) return 'Ace'
  const d = s - props.par
  if (d === -3) return 'Albatross'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0) return 'Par'
  // Named as far as the names go, then the number — nobody says "sextuple bogey".
  return OVER[d - 1] ?? `+${d}`
}

// The stroke whose tile is nearest the scroll viewport's centre.
function centred(): number {
  const el = track.value
  if (!el) return props.modelValue
  const mid = el.scrollLeft + el.clientWidth / 2
  let best = 1
  let bestDist = Infinity
  el.querySelectorAll<HTMLElement>('[data-tile]').forEach((t, i) => {
    const d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - mid)
    if (d < bestDist) {
      bestDist = d
      best = i + 1
    }
  })
  return best
}
// Animated unless the reader asked for less; read per call because the setting can change
// while the page is open.
function behavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
function scrollToStrokes(s: number, behavior: ScrollBehavior) {
  const el = track.value
  const tile = el?.querySelectorAll<HTMLElement>('[data-tile]')[s - 1]
  if (!el || !tile) return
  el.scrollTo({ left: tile.offsetLeft + tile.offsetWidth / 2 - el.clientWidth / 2, behavior })
}
function onScroll() {
  if (props.readonly) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const s = centred()
    if (s !== props.modelValue) emit('update:modelValue', s)
  })
}
function select(s: number) {
  if (props.readonly) return
  // Emit only. The watch below owns the scrolling, so a tap and an arrow key move the
  // wheel the same way and neither races the other to it.
  emit('update:modelValue', s)
}
// One tab stop per wheel, and the arrows move the selection — the tiles are radios, not
// twenty buttons. Focus alone must never record a score: it used to, because focusing a
// tile scrolls it into view and the scroll handler reads whatever it centres, so tabbing
// towards Save rewrote every player's score on the way past.
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
  // preventScroll: the browser would otherwise pull the tile to the nearest edge, and that
  // scroll lands after ours and wins — the selection changed but the wheel stayed put with
  // the new number hanging off the side.
  nextTick(() => track.value?.querySelectorAll<HTMLElement>('[data-tile]')[to - 1]?.focus({ preventScroll: true }))
}

onMounted(() => nextTick(() => scrollToStrokes(props.modelValue, 'auto')))
watch(
  () => props.modelValue,
  (v) => {
    if (centred() !== v) scrollToStrokes(v, behavior())
  },
)
</script>
<template>
  <div class="py-4">
    <div class="flex items-center justify-between px-4 text-2xl">
      <span class="font-display font-semibold text-mrc-ink">{{ name }}</span>
      <span class="tabular-nums text-mrc-ink">{{ total }} ({{ rel }})</span>
    </div>
    <div
      ref="track"
      @scroll="onScroll"
      @keydown="onKeydown"
      role="radiogroup"
      :aria-label="`Strokes for ${name}`"
      class="relative flex snap-x snap-mandatory py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :class="readonly ? 'overflow-x-hidden' : 'overflow-x-auto'"
    >
      <div class="w-[calc(50%-3rem)] shrink-0" />
      <button
        v-for="s in strokes"
        :key="s"
        type="button"
        data-tile
        role="radio"
        :aria-checked="!unscored && s === modelValue"
        :tabindex="s === modelValue ? 0 : -1"
        class="w-24 shrink-0 snap-center text-center transition-colors"
        :class="!unscored && s === modelValue ? 'text-mrc-ink' : 'text-mrc-muted'"
        @click="select(s)"
      >
        <span class="block text-7xl font-bold leading-none">{{ s }}</span>
        <span class="mt-1 block whitespace-nowrap text-lg">{{ term(s) }}</span>
        <!-- Always rendered so selecting can't shift the row, and a second cue besides the
             weight of the ink: the numbers differ only in how dark they are. -->
        <span
          class="mx-auto mt-1.5 block h-1 w-8 rounded-full"
          :class="!unscored && s === modelValue ? 'bg-mrc-accent' : 'bg-transparent'"
        />
      </button>
      <div class="w-[calc(50%-3rem)] shrink-0" />
    </div>
  </div>
</template>
