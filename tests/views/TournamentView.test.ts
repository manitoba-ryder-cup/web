import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournament: vi.fn().mockResolvedValue({
      id: 't1',
      name: 'Summer Cup',
      start_date: '2026-07-01',
      end_date: '2026-07-03',
      location: 'Winnipeg',
    }),
    getTournamentTeams: vi.fn().mockResolvedValue([
      { id: 'red-1', color: 'Red', captain: { id: 'p1', first_name: 'Amy', last_name: 'Smith', email: null }, points: 8 },
      { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones', email: null }, points: 6 },
    ]),
    getTournamentWinner: vi.fn().mockResolvedValue({ finished: true, winner_team_id: 'red-1' }),
  },
}))

import TournamentView from '@/views/TournamentView.vue'

describe('TournamentView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders team standings and the finished winner', async () => {
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    // Header
    expect(text).toContain('Summer Cup')
    expect(text).toContain('Winnipeg')

    // Standings: both teams' points are shown.
    expect(text).toContain('8')
    expect(text).toContain('6')
    expect(text).toContain('Amy Smith')
    expect(text).toContain('Bo Jones')

    // Result: Red team (winner_team_id matches red-1) is announced as the winner.
    expect(text).toMatch(/Red (wins|won)/i)
    expect(text).not.toMatch(/in progress/i)
  })
})
