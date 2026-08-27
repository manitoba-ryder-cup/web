import { useAsync } from '@/composables/useAsync'
import { useCupStore } from '@/stores/cup'

// Which cup the undated pages mean. A resource of its own, so a lookup that failed is an error
// and no cup at all is an answer — a page combining it can tell those apart.
export function useCurrentCup() {
  const cup = useCupStore()
  const res = useAsync(['cup'], () => cup.load().then(() => cup.latestId))
  return {
    ...res,
    id: () => res.data.value ?? '',
    known: () => !!res.data.value,
  }
}
