import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createPinia, setActivePinia } from 'pinia'
import { scorecardApi } from '@/api/scorecard'
import { useCupStore } from '@/stores/cup'

const CUPS = [
  { id: 'old', name: 'Cup', start_date: '2025-07-01', end_date: '2025-07-02', location: 'Gimli' },
  { id: 'latest', name: 'Cup', start_date: '2026-09-18', end_date: '2026-09-19', location: 'Buffalo Point' },
]

describe('the cup store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sends Scores to the list until the cup is known', () => {
    expect(useCupStore().scoresTo).toBe('/tournaments')
  })

  it('sends Scores to the most recent cup, not the first listed', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)
    const cup = useCupStore()

    await cup.load()

    expect(cup.scoresTo).toBe('/tournaments/latest')
  })

  it('asks once however many callers there are', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)
    const cup = useCupStore()

    await Promise.all([cup.load(), cup.load()])
    await cup.load()

    expect(scorecardApi.listTournaments).toHaveBeenCalledTimes(1)
  })

  // The header and the tab bar mount once for the session, so a lookup that failed and
  // stayed failed left Scores on the history list until the app was reloaded.
  it('stays unresolved after a failure, so the next caller tries again', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(CUPS)
    const cup = useCupStore()

    await cup.load()
    expect(cup.scoresTo).toBe('/tournaments')

    await cup.load()

    expect(cup.scoresTo).toBe('/tournaments/latest')
  })

  it('resolves to the list when there are no cups at all', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([])
    const cup = useCupStore()

    await cup.load()

    expect(cup.scoresTo).toBe('/tournaments')
  })
})
