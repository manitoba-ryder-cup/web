import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useCurrentCup } from '@/composables/useCurrentCup'
import type { Tournament } from '@/api/types'

const CUPS: Tournament[] = [
  { id: 'old', name: 'Cup', start_date: '2025-07-01', end_date: '2025-07-02', location: 'Gimli', phase: 'upcoming' },
  { id: 'latest', name: 'Cup', start_date: '2026-09-18', end_date: '2026-09-19', location: 'Buffalo Point', phase: 'upcoming' },
]

// Rendered, so the query is live: a composable called outside a component never fetches. The
// click retries, which is the only other thing a caller of this does.
const Probe = defineComponent({
  setup() {
    const cup = useCurrentCup()
    return () => h('div', { onClick: () => cup.retry() }, cup.scoresTo.value)
  },
})

const mountProbes = (n = 1) => Array.from({ length: n }, () => mount(Probe))

describe('useCurrentCup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends Scores to the list until the cup is known', () => {
    vi.mocked(scorecardApi.listTournaments).mockReturnValue(new Promise(() => {}))

    expect(mountProbes()[0].text()).toBe('/tournaments')
  })

  it('sends Scores to the most recent cup, not the first listed', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)
    const [w] = mountProbes()

    await flushPromises()

    expect(w.text()).toBe('/tournaments/latest')
  })

  // The shell and the pages all want this. Under one key they are one request — which is the
  // whole reason the store this replaced had to dedupe by hand.
  it('asks once however many callers there are', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)

    const probes = mountProbes(3)
    await flushPromises()

    expect(scorecardApi.listTournaments).toHaveBeenCalledTimes(1)
    for (const w of probes) expect(w.text()).toBe('/tournaments/latest')
  })

  it('sends Scores to the list when the lookup fails', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))
    const [w] = mountProbes()

    await flushPromises()

    expect(w.text()).toBe('/tournaments')
  })

  // A failed lookup is not an answer of "no cup": retrying has to reach the server again.
  it('recovers on a retry after a failure', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(CUPS)
    const [w] = mountProbes()
    await flushPromises()
    expect(w.text()).toBe('/tournaments')

    await w.trigger('click')
    await flushPromises()

    expect(w.text()).toBe('/tournaments/latest')
  })

  it('sends Scores to the list when there are no cups at all', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([])
    const [w] = mountProbes()

    await flushPromises()

    expect(w.text()).toBe('/tournaments')
  })
})
