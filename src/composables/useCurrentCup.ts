import { computed } from 'vue'
import { q } from '@/api/queries'
import { useResource } from '@/composables/useAsync'

// Which cup the undated pages mean: the most recent by start date. A resource like any other,
// so the shell and every page needing it share one answer rather than each asking.
export function useCurrentCup() {
  const res = useResource(() => q.tournaments())
  const latest = computed(() => [...(res.data.value ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? '')
  // Where Scores points, or the list until the cup is known — a lookup that failed leaves a
  // worse link rather than a broken one, and the shell can carry on around it.
  const scoresTo = computed(() => (latest.value ? `/tournaments/${latest.value}` : '/tournaments'))
  return { ...res, id: () => latest.value, known: () => !!latest.value, scoresTo }
}
