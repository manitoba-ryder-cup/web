import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getPlayer: vi.fn().mockResolvedValue({
      id: 'p1', user_id: null, email: null, first_name: 'Jane', last_name: 'Doe',
      photo_path: '', record: { wins: 5, losses: 2, ties: 1 },
    }),
    getPlayerTournaments: vi.fn().mockResolvedValue([
      {
        tournament_id: 't1', name: 'Cup 2024', location: 'Clear Lake',
        start_date: '2024-08-10', end_date: '2024-08-11',
        captain_first_name: 'Cam', captain_last_name: 'Macaulay',
        result: 'won', record: { wins: 3, losses: 1, ties: 0 },
      },
      {
        tournament_id: 't2', name: 'Cup 2023', location: 'Hecla',
        start_date: '2023-08-12', end_date: '2023-08-13',
        captain_first_name: 'Nick', captain_last_name: 'Milnes',
        result: 'lost', record: { wins: 1, losses: 3, ties: 0 },
      },
    ]),
  },
}))

import PlayerView from '@/views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
    { path: '/players/:id/tournaments/:tournamentId', name: 'player-tournament', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
  ],
})

describe('PlayerView', () => {
  beforeEach(async () => { router.push('/players/p1'); await router.isReady() })
  it('renders the player name and W-L-T record', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(w.text()).toContain('Jane Doe')
    expect(w.text()).toContain('5') // wins
    expect(w.text()).toContain('2') // losses
    expect(w.text()).toContain('1') // ties
  })

  it('renders the tournament history and cups summary', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    // Cups summary derived from history (2 played, 1 won).
    expect(w.text()).toContain('2 played · 1 won')
    // History rows: year, team color, and result badge text.
    // The team is identified by captain ("Team {surname}"), never by colour.
    expect(w.text()).toContain('2024')
    expect(w.text()).toContain('Team Macaulay')
    expect(w.text()).toContain('Won')
    expect(w.text()).toContain('Clear Lake')
    expect(w.text()).toContain('2023')
    expect(w.text()).toContain('Team Milnes')
    expect(w.text()).toContain('Lost')
  })

  it('links each history row to its per-tournament page', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    // Rows drill into the player's scouting report for that year, not the tournament page.
    expect(w.find('a[href="/players/p1/tournaments/t1"]').exists()).toBe(true)
    expect(w.find('a[href="/players/p1/tournaments/t2"]').exists()).toBe(true)
  })
})
