import { computed, onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from 'vue'

export interface CountdownSegment {
  text: string // zero-padded, since a countdown that changes width jitters
  label: string
}

// Counts down to a target timestamp, re-evaluating every second. Returns null once the
// target has passed or when there is no target, so a caller can drop the whole block.
export function useCountdown(target: MaybeRefOrGetter<number | null>) {
  const now = ref(Date.now())
  let ticker: number | undefined
  onMounted(() => {
    ticker = window.setInterval(() => (now.value = Date.now()), 1000)
  })
  onUnmounted(() => {
    if (ticker) clearInterval(ticker)
  })

  const segments = computed<CountdownSegment[] | null>(() => {
    const at = toValue(target)
    if (at == null) return null
    const ms = at - now.value
    if (ms <= 0) return null
    const s = Math.floor(ms / 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return [
      { text: pad(Math.floor(s / 86_400)), label: 'Days' },
      { text: pad(Math.floor((s % 86_400) / 3600)), label: 'Hrs' },
      { text: pad(Math.floor((s % 3600) / 60)), label: 'Min' },
      { text: pad(s % 60), label: 'Sec' },
    ]
  })

  return { segments }
}
