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

  // A view awaits load() for the value now, so returning early to a request still in
  // flight would hand it the null it renders as "there is no cup".
  it('makes a caller that joins a request in flight wait for its answer', async () => {
    let release: (v: typeof CUPS) => void = () => {}
    vi.mocked(scorecardApi.listTournaments).mockReturnValue(new Promise((r) => (release = r)))
    const cup = useCupStore()

    const first = cup.load()
    let joinedResolved = false
    void cup.load().then(() => (joinedResolved = true))
    await new Promise((r) => setTimeout(r, 0))

    expect(joinedResolved).toBe(false)

    release(CUPS)
    await first
    expect(cup.latestId).toBe('latest')
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

    await expect(cup.load()).rejects.toThrow('offline')
    expect(cup.scoresTo).toBe('/tournaments')

    await cup.load()

    expect(cup.scoresTo).toBe('/tournaments/latest')
  })

  // A view puts the failure on screen with a retry; rendering "no cup yet" instead would
  // be a claim about data that never arrived.
  it('tells a caller the lookup failed rather than reporting no cup', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))

    await expect(useCupStore().load()).rejects.toThrow('offline')
  })

  it('resolves to the list when there are no cups at all', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([])
    const cup = useCupStore()

    await cup.load()

    expect(cup.scoresTo).toBe('/tournaments')
  })
})
