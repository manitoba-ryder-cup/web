import { computed, ref, watch } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'

// The tees a course offers, and which of them is picked. Keyed by course, so a response for one
// the picker has already moved past lands under its own key rather than over this one.
export function useCourseTees() {
  const courseId = ref('')
  const prefer = ref<string | undefined>()
  const selected = ref('')

  const { data, error, retry } = useAsync(
    () => ['course-tees', courseId.value],
    () => (courseId.value ? scorecardApi.getCourseTees(courseId.value) : Promise.resolve([])),
  )
  const tees = computed(() => data.value ?? [])
  const failed = computed(() => !!error.value)

  watch(tees, (loaded) => {
    // A pick still on the list survives: every write on these pages invalidates this query, and
    // re-deriving on the refetch would take the tee back off whoever had just chosen it.
    if (selected.value && loaded.some((t) => t.tee_color_id === selected.value)) return
    const wanted = prefer.value && loaded.some((t) => t.tee_color_id === prefer.value) ? prefer.value : ''
    selected.value = wanted || loaded[0]?.tee_color_id || ''
  })

  // The preference is held rather than passed through, so a retry re-applies it — called bare it
  // would fall to the first tee, which on a failed first load arms a change nobody asked for.
  function load(id: string, want?: string) {
    courseId.value = id
    prefer.value = want
    // Cleared with the list: a tee id outlives the course it came from, and the pair it makes
    // with the new one is refused by the API.
    selected.value = ''
  }

  return { tees, failed, selected, load, retry }
}
