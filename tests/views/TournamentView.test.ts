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

    // Hero: "{year} Leaderboard", captains above (identified by surname, not color), location below.
    expect(text).toContain('2026 Leaderboard')
    expect(text).toContain('Team Jones vs. Team Smith')
    expect(text).toContain('Winnipeg')

    // ScoreBar: each team's total points show on the ends.
    expect(text).toContain('8')
    expect(text).toContain('6')

    // Result: Red team (winner_team_id matches red-1) is announced as the winner (via WinnerBanner).
    expect(text).toMatch(/Red\s*wins/i)
    expect(text).not.toMatch(/in progress/i)

    // Match results: the per-format section renders a row with a player name + margin.
    expect(text).toContain('Singles')
    expect(text).toContain('Cara Lee')
    expect(text).toContain('3 & 2')
  })

  it('omits the hero captains line when a team has no captain', async () => {
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValueOnce([
      { id: 'red-1', color: 'Red', captain: null, points: 3 },
      { id: 'blue-1', color: 'Blue', captain: { id: 'p2', first_name: 'Bo', last_name: 'Jones', email: null }, points: 5 },
    ])
    const wrapper = mount(TournamentView, { props: { id: 't1' } })
    await flushPromises()
    const text = wrapper.text()

    // No "Team X vs. Team Y" when a captain is missing; the rest still renders.
    expect(text).not.toContain('vs.')
    expect(text).toContain('2026 Leaderboard')
    expect(text).toContain('5')
    expect(text).toContain('3')
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
