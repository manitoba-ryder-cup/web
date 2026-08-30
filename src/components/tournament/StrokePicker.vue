<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, watch, ref } from 'vue'
import { centreOffset, revealOffset } from '@/lib/strokeStrip'

// eslint-disable-next-line comment-cap/max-lines -- names the control this replaced and the
// bug that made it worth replacing, which is the reason never to let the scroll select again.
// Par sits in the same place in every player's strip, so the fill's position is the score
// against par and a hole reads down the column. Choosing fills the tile where it sits, and the
// strip moves only to bring a stroke off the end into view — it never reads its own scroll to
// decide anything. The control this replaced selected whatever the scroll had centred, so a
// stray drag or a focus recorded a score nobody picked. priorStrokes/priorPar are the round
// before this hole, so the readout is a running total; 0/0 reads as this hole alone.
const props = withDefaults(
  defineProps<{
    // Null until a score is chosen. The strip still parks on par, but filling it would read
    // as a par nobody made and would save as one.
    modelValue: number | null
    par: number
    name: string
    readonly?: boolean
    priorStrokes?: number
    priorPar?: number
  }>(),
  { readonly: false, priorStrokes: 0, priorPar: 0 },
)
const emit = defineEmits<{ 'update:modelValue': [strokes: number] }>()

const MAX = 20
const STEP: Record<string, (from: number) => number> = {
  ArrowRight: (from) => Math.min(MAX, from + 1),
  ArrowDown: (from) => Math.min(MAX, from + 1),
  ArrowLeft: (from) => Math.max(1, from - 1),
  ArrowUp: (from) => Math.max(1, from - 1),
  Home: () => 1,
  End: () => MAX,
}
const strokes = Array.from({ length: MAX }, (_, i) => i + 1)
const track = ref<HTMLElement | null>(null)

// An unchosen hole adds nothing to either side of the comparison — the strip sits on par but
// that par was never made — so the readout is the round as it stood before it.
const total = computed(() => props.priorStrokes + (props.modelValue ?? 0))
const rel = computed(() => {
  const d = total.value - (props.priorPar + (props.modelValue === null ? 0 : props.par))
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
// Re-run when par changes or the strip resizes: the component is reused hole to hole, so
// without this the strips drift out of column the first time par does.
function anchor() {
  const el = track.value
  const tile = tileAt(props.par)
  if (!el || !tile) return
  el.scrollLeft = centreOffset(tile.offsetLeft, tile.offsetWidth, el.clientWidth)
}
// A stroke already on screen never moves the strip: choosing must not shift it under the
// finger that chose. One off screen is centred, which is where the snapping would put it.
function reveal(s: number | null) {
  const el = track.value
  const tile = s === null ? undefined : tileAt(s)
  if (!el || !tile) return
  el.scrollLeft = revealOffset(el.scrollLeft, el.clientWidth, tile.offsetLeft, tile.offsetWidth)
}
function settle() {
  anchor()
  reveal(props.modelValue)
}
function select(s: number) {
  if (props.readonly) return
  emit('update:modelValue', s)
}
// One tab stop per player, arrows to move. Reaching a tile is a tap, a deliberate key, or
// scrolling to it — never Tab passing through on its way to Save.
function onKeydown(e: KeyboardEvent) {
  const step = STEP[e.key]
  if (props.readonly || !step) return
  e.preventDefault()
  // With nothing chosen the first key takes par, so reaching it is not a step past and back.
  const to = props.modelValue === null ? props.par : step(props.modelValue)
  select(to)
  // preventScroll so the browser's own nudge doesn't fight reveal's.
  nextTick(() => tileAt(to)?.focus({ preventScroll: true }))
}

onMounted(() => {
  nextTick(settle)
  window.addEventListener('resize', settle)
})
onBeforeUnmount(() => window.removeEventListener('resize', settle))

// Par first: stepping between holes reuses this component with a new par and a new score, and
// re-pinning has to happen before that score is brought into view.
watch(() => props.par, settle)
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
      class="relative mt-3 flex snap-x snap-mandatory gap-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :class="readonly ? 'overflow-x-hidden' : 'overflow-x-auto'"
    >
      <!-- Half the strip less half a tile at each end, so par can sit centred and the low
           scores are still reachable to its left. -->
      <div class="w-[calc(50%-2.75rem)] shrink-0" />
      <!-- No transition on the fill: par and the score change together at a hole change, and
           animating it left the previous hole's number lit on the new hole's strip. -->
      <button
        v-for="s in strokes"
        :key="s"
        type="button"
        data-stroke
        role="radio"
        :aria-checked="s === modelValue"
        :tabindex="s === (modelValue ?? par) ? 0 : -1"
        :disabled="readonly"
        class="min-h-[76px] w-[5.5rem] shrink-0 snap-center rounded-lg px-1 py-2 text-center"
        :class="s === modelValue ? 'bg-mrc-accent text-white' : 'text-mrc-charcoal'"
        @click="select(s)"
      >
        <span class="block text-5xl font-bold leading-none tabular-nums">{{ s }}</span>
        <span class="mt-1 block truncate text-sm">{{ term(s) }}</span>
      </button>
      <div class="w-[calc(50%-2.75rem)] shrink-0" />
    </div>
  </div>
</template>
