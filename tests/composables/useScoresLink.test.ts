import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { scorecardApi } from '@/api/scorecard'
import { useScoresLink, resetScoresLink } from '@/composables/useScoresLink'

const CUPS = [
  { id: 'old', name: 'Cup', start_date: '2025-07-01', end_date: '2025-07-02', location: 'Gimli' },
  { id: 'latest', name: 'Cup', start_date: '2026-09-18', end_date: '2026-09-19', location: 'Buffalo Point' },
]

// The retry is on a timer, so the clock has to be ours to advance.
const flush = async () => {
  await vi.advanceTimersByTimeAsync(0)
}

describe('useScoresLink', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resetScoresLink()
  })
  afterEach(() => vi.useRealTimers())

  it('points at the most recent cup once it resolves', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)

    const link = useScoresLink()
    await flush()

    expect(link.value).toBe('/tournaments/latest')
  })

  it('falls back to the list until it resolves', () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)

    expect(useScoresLink().value).toBe('/tournaments')
  })

  // The header and the tab bar each ask once, in setup, and never again — so without a
  // retry one failed call at cold start left Scores on the history list for the session.
  it('tries again after a failure and recovers', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(CUPS)

    const link = useScoresLink()
    await flush()
    expect(link.value).toBe('/tournaments')

    await vi.advanceTimersByTimeAsync(2000)

    expect(link.value).toBe('/tournaments/latest')
  })

  it('gives up after a bounded number of attempts, leaving a link that works', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))

    const link = useScoresLink()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(scorecardApi.listTournaments).toHaveBeenCalledTimes(3)
    expect(link.value).toBe('/tournaments')
  })

  it('shares one lookup between the header and the tab bar', async () => {
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue(CUPS)

    useScoresLink()
    useScoresLink()
    await flush()

    expect(scorecardApi.listTournaments).toHaveBeenCalledTimes(1)
  })
})
