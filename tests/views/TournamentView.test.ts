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

  it('renders the hero, standings bar, and match-result tabs', async () => {
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

    // Match results: the active format tab renders a row with a player name + margin.
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
})
