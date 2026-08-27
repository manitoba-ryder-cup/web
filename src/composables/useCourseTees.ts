import { computed, ref } from 'vue'
import { q } from '@/api/queries'
import { useResource } from '@/composables/useAsync'

// The tees a course offers, and which of them is picked. Keyed by course, so a response for one
// the picker has already moved past lands under its own key rather than over this one.
export function useCourseTees() {
  const courseId = ref('')
  const prefer = ref<string | undefined>()
  const picked = ref('')

  const { data, error, loading, retry } = useResource(() => q.courseTees(courseId.value), { enabled: () => !!courseId.value })
  const tees = computed(() => data.value ?? [])
  const failed = computed(() => !!error.value)
  const offered = (id: string | undefined) => !!id && tees.value.some((t) => t.tee_color_id === id)

  // Derived, not assigned on arrival: a pick that is still offered stands, and anything else
  // falls to the preference and then the first tee — whether the list just came or was here.
  const selected = computed({
    get: () => (offered(picked.value) ? picked.value : offered(prefer.value) ? prefer.value! : (tees.value[0]?.tee_color_id ?? '')),
    set: (value: string) => (picked.value = value),
  })

  // The preference is kept rather than consumed, so a retry lands on it too: falling to the
  // first tee after a failed first load arms a tee change nobody asked for.
  function load(id: string, want?: string) {
    courseId.value = id
    prefer.value = want
    picked.value = ''
  }

  return { tees, failed, loading, selected, load, retry }
}
