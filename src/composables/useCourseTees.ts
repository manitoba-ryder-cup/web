import { ref } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { TeeSetSummary } from '@/api/types'

// The tees a course offers, and which of them is picked. Held here rather than in the page
// because the interesting part is the race, and that is the same wherever it is used.
export function useCourseTees() {
  const tees = ref<TeeSetSummary[]>([])
  const failed = ref(false)
  const selected = ref('')
  // A token, because switching course twice quickly can land the first response last and leave
  // the course reading one thing and the tees another — a pair the server refuses as a 400.
  let request = 0
  let asked: { courseId: string; prefer?: string } = { courseId: '' }

  async function load(courseId: string, prefer?: string) {
    const mine = ++request
    asked = { courseId, prefer }
    tees.value = []
    // Cleared with them: a tee id from the last course outlives the list it came from, and the
    // pair it makes with the new course is one the API refuses.
    selected.value = ''
    failed.value = false
    if (!courseId) return
    let loaded: TeeSetSummary[]
    try {
      loaded = await scorecardApi.getCourseTees(courseId)
    } catch {
      if (mine === request) failed.value = true
      return
    }
    if (mine !== request) return
    tees.value = loaded
    const wanted = prefer && loaded.some((t) => t.tee_color_id === prefer) ? prefer : ''
    selected.value = wanted || loaded[0]?.tee_color_id || ''
  }

  // Re-issues what failed, preference and all. Called bare it would fall through to the first
  // tee in the list, which on a failed initial load arms a tee change on the match's own course.
  const retry = () => load(asked.courseId, asked.prefer)

  return { tees, failed, selected, load, retry }
}
