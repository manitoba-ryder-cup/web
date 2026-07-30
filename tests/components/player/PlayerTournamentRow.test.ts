import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentResults: vi.fn().mockResolvedValue([]),
    getTournamentTeams: vi.fn().mockResolvedValue([]),
  },
}))

import PlayerTournamentRow from '@/components/player/PlayerTournamentRow.vue'
import { scorecardApi } from '@/api/scorecard'

const entry = {
  tournament_id: 't1',
  name: 'Cup 2024',
  location: 'Clear Lake',
  start_date: '2024-08-10',
  end_date: '2024-08-11',
  captain_first_name: 'Cam',
  captain_last_name: 'Macaulay',
  result: 'won',
  record: { wins: 3, losses: 1, ties: 0 },
  tier: 'gold',
  biography: '',
} as never

const mountRow = (open: boolean) =>
  mount(PlayerTournamentRow, {
    props: { entry, playerId: 'p1', open },
    global: { stubs: { RouterLink: true } },
  })

describe('PlayerTournamentRow', () => {
  beforeEach(() => vi.mocked(scorecardApi.getTournamentResults).mockClear())

  it('loads the matches when opened by a click', async () => {
    const w = mountRow(false)
    await w.setProps({ open: true })
    await flushPromises()
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledWith('t1')
  })

  // The deep-link case: the hash resolves before the row has ever rendered closed, so the
  // row is created with open already true and there is no false→true transition to watch.
  it('loads the matches when it is created already open', async () => {
    mountRow(true)
    await flushPromises()
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledWith('t1')
  })
})
