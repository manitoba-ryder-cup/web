<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'

// v2's score wheel, reproduced: a horizontal row of big number tiles, each labelled with
// its scoring term; the centred tile is the selection (dark), the rest are faded — no
// highlight box. The mechanism is rebuilt to measure tile positions from the DOM rather
// than deriving them from screen width.
const props = withDefaults(defineProps<{ modelValue: number; par: number; name: string; readonly?: boolean }>(), { readonly: false })
const emit = defineEmits<{ 'update:modelValue': [strokes: number] }>()

const MAX = 20
const strokes = Array.from({ length: MAX }, (_, i) => i + 1)
const track = ref<HTMLElement | null>(null)
let raf = 0

const rel = computed(() => {
  const d = props.modelValue - props.par
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
})
function term(s: number): string {
  if (s === 1) return 'Ace'
  switch (s - props.par) {
    case -3:
      return 'Albatross'
    case -2:
      return 'Eagle'
    case -1:
      return 'Birdie'
    case 0:
      return 'Par'
    case 1:
      return 'Bogey'
    default:
      return `${s - props.par} Bogey`
  }
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
  emit('update:modelValue', s)
  scrollToStrokes(s, 'smooth')
}

onMounted(() => nextTick(() => scrollToStrokes(props.modelValue, 'auto')))
watch(
  () => props.modelValue,
  (v) => {
    if (centred() !== v) scrollToStrokes(v, 'auto')
  },
)
</script>
<template>
  <div class="py-4">
    <div class="flex items-center justify-between px-4 text-2xl">
      <span class="font-display font-semibold text-mrc-ink">{{ name }}</span>
      <span class="tabular-nums text-mrc-ink">{{ modelValue }} ({{ rel }})</span>
    </div>
    <div
      ref="track"
      @scroll="onScroll"
      class="relative flex snap-x snap-mandatory py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :class="readonly ? 'overflow-x-hidden' : 'overflow-x-auto'"
    >
      <div class="w-[calc(50%-3rem)] shrink-0" />
      <button
        v-for="s in strokes"
        :key="s"
        type="button"
        data-tile
        class="w-24 shrink-0 snap-center text-center transition-colors"
        :class="s === modelValue ? 'text-mrc-ink' : 'text-mrc-line'"
        @click="select(s)"
      >
        <span class="block text-7xl font-bold leading-none">{{ s }}</span>
        <span class="mt-1 block whitespace-nowrap text-lg">{{ term(s) }}</span>
      </button>
      <div class="w-[calc(50%-3rem)] shrink-0" />
    </div>
  </div>
</template>
