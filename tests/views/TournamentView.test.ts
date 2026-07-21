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
    getTournamentResults: vi.fn().mockResolvedValue([
      {
        match_id: 'm1',
        format_name: 'Singles',
        finished: true,
        winner_color: 'Red',
        lead: 3,
        holes_remaining: 2,
        red_players: [{ player_id: 'r1', first_name: 'Cara', last_name: 'Lee' }],
        blue_players: [{ player_id: 'b1', first_name: 'Dan', last_name: 'Roy' }],
      },
    ]),
  },
}))

import { scorecardApi } from '@/api/scorecard'
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

    // Result: Red team (winner_team_id matches red-1) is announced as the winner (via WinnerBanner).
    expect(text).toMatch(/Red\s*wins/i)
    expect(text).not.toMatch(/in progress/i)

    // Match results: the per-format section renders a row with a player name + margin.
    expect(text).toContain('Singles')
    expect(text).toContain('Cara Lee')
    expect(text).toContain('3 & 2')
  })

  it('shows the captain fallback when a team has no captain', async () => {
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValueOnce([
      { id: 'red-1', color: 'Red', captain: null, points: 3 },
      { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones', email: null }, points: 5 },
    ])
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    expect(text).toContain('No captain assigned')
    expect(text).toContain('Bo Jones')
    expect(text).toContain('3')
    expect(text).toContain('5')
  })

  it('shows a tie when winner_team_id is null', async () => {
    vi.mocked(scorecardApi.getTournamentWinner).mockResolvedValueOnce({ finished: true, winner_team_id: null })
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    expect(text).toMatch(/tied/i)
    expect(text).not.toMatch(/wins/i)
  })

  it('maps an unrecognized winner id to a tie (never "Unknown")', async () => {
    vi.mocked(scorecardApi.getTournamentWinner).mockResolvedValueOnce({ finished: true, winner_team_id: 'ghost-99' })
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    expect(text).toMatch(/tied/i)
    expect(text).not.toMatch(/unknown/i)
  })

  it('shows "In progress" when the tournament is not finished', async () => {
    vi.mocked(scorecardApi.getTournamentWinner).mockResolvedValueOnce({ finished: false, winner_team_id: null })
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    expect(text).toMatch(/in progress/i)
    expect(text).not.toMatch(/wins/i)
  })
})
