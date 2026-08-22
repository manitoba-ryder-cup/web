import { onMounted, onUnmounted, ref } from 'vue'

// Derived from a match's bounds alone, a page open across the moment a window opens has
// nothing to recompute from.
export function useCoarseClock(everyMs = 30_000) {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => (timer = setInterval(() => (now.value = new Date()), everyMs)))
  onUnmounted(() => clearInterval(timer))
  return now
}
