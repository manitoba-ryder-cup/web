import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { getCourseTees: vi.fn() } }))

import { scorecardApi } from '@/api/scorecard'
import { useCourseTees } from '@/composables/useCourseTees'

const tee = (id: string, color: string) => ({ course_id: 'c1', tee_color_id: id, color, slope: 113, rating: 72 })

const Host = defineComponent({
  setup: () => useCourseTees(),
  template: '<div/>',
})

const host = async () => {
  const w = mount(Host)
  await flushPromises()
  return w
}

describe('useCourseTees', () => {
  beforeEach(() => {
    vi.mocked(scorecardApi.getCourseTees).mockReset()
  })

  it('settles on the preferred tee when the course offers it', async () => {
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([tee('white', 'White'), tee('gold', 'Gold')])
    const w = await host()

    w.vm.load('c1', 'gold')
    await flushPromises()

    expect(w.vm.selected).toBe('gold')
  })

  it('falls to the first tee when the preferred one is not offered', async () => {
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([tee('white', 'White')])
    const w = await host()

    w.vm.load('c1', 'gold')
    await flushPromises()

    expect(w.vm.selected).toBe('white')
  })

  // A picker moved on before the first course answered: the late reply must not reach back and
  // change a tee that is now being read against a different course.
  it('ignores a response for a course it has moved past', async () => {
    let answerFirst: (v: unknown) => void = () => {}
    vi.mocked(scorecardApi.getCourseTees)
      .mockReturnValueOnce(new Promise((r) => (answerFirst = r)) as never)
      .mockResolvedValueOnce([tee('blue', 'Blue')])
    const w = await host()

    // Awaited between: two loads in one tick collapse into a single fetch, so the first has
    // to actually be in flight for its late answer to be the thing under test.
    w.vm.load('c1')
    await flushPromises()
    w.vm.load('c2')
    await flushPromises()
    answerFirst([tee('white', 'White')])
    await flushPromises()

    expect(w.vm.selected).toBe('blue')
  })

  // The preference is kept rather than consumed, or a retry after a failed first load arms a
  // tee change nobody asked for.
  it('still prefers the match tee after a retry', async () => {
    vi.mocked(scorecardApi.getCourseTees)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([tee('white', 'White'), tee('gold', 'Gold')])
    const w = await host()

    w.vm.load('c1', 'gold')
    await flushPromises()
    expect(w.vm.failed).toBe(true)

    await w.vm.retry()
    await flushPromises()

    expect(w.vm.selected).toBe('gold')
  })
})
