import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getPlayer: vi.fn().mockResolvedValue({
      id: 'p1',
      user_id: null,
      first_name: 'Jane',
      last_name: 'Doe',
      photo_path: '',
      record: { wins: 5, losses: 2, ties: 1 },
    }),
    getPlayerStats: vi.fn().mockResolvedValue({
      by_format: [{ format_name: 'Singles', record: { wins: 3, losses: 1, ties: 0 } }],
      teammates: [
        { player_id: 'p2', first_name: 'Cam', last_name: 'Macaulay', matches: 3, record: { wins: 2, losses: 1, ties: 0 } },
        { player_id: 'p3', first_name: 'One', last_name: 'Off', matches: 1, record: { wins: 1, losses: 0, ties: 0 } },
      ],
      opponents: [{ player_id: 'p4', first_name: 'Nick', last_name: 'Milnes', matches: 4, record: { wins: 1, losses: 3, ties: 0 } }],
      points: 3,
      cups_played: 2,
      last_hole: { wins: 1, losses: 1, ties: 0 },
      decided_early: { wins: 2, losses: 0, ties: 0 },
      best_win: { year: '2019', lead: 9, holes_remaining: 7, opponents: 'Phin' },
      heaviest_loss: { year: '2017', lead: 5, holes_remaining: 0, opponents: 'Macaulay / Ray' },
    }),
    getTournamentResults: vi.fn().mockResolvedValue([]),
    getTournamentTeams: vi.fn().mockResolvedValue([]),
    getPlayerTournaments: vi.fn().mockResolvedValue([
      {
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
        biography: 'Jane once holed out from the car park.',
      },
      {
        tournament_id: 't2',
        name: 'Cup 2023',
        location: 'Hecla',
        start_date: '2023-08-12',
        end_date: '2023-08-13',
        captain_first_name: 'Nick',
        captain_last_name: 'Milnes',
        result: 'lost',
        record: { wins: 1, losses: 3, ties: 0 },
        tier: 'blue',
        biography: '',
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
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
  ],
})

describe('PlayerView', () => {
  beforeEach(async () => {
    router.push('/players/p1')
    await router.isReady()
  })
  it('holds the hero open while loading instead of collapsing to a blank page', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })

    // The hero is v-if="player", so before this a loading profile was a nav bar over
    // nothing — and then the whole page appeared at once.
    expect(w.find('[data-testid="hero-skeleton"]').exists()).toBe(true)
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)

    await flushPromises()

    expect(w.find('[data-testid="hero-skeleton"]').exists()).toBe(false)
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Jane Doe')
  })

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
    // Cups played is derived from the history and counted in the hero, beside the career
    // record and cups won that the player endpoint supplies.
    expect(w.text()).toContain('Cups')
    // History rows: year, team color, and result badge text.
    // The team is identified by captain ("Team {surname}"), never by colour.
    expect(w.text()).toContain('2024')
    expect(w.text()).toContain('Team Macaulay')
    expect(w.text()).toContain('Won')
    expect(w.text()).toContain('2023')
    expect(w.text()).toContain('Team Milnes')
    expect(w.text()).toContain('Lost')
  })

  it('opens a cup in place, and only one at a time', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    const rows = w.findAll('button[aria-expanded]')
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.attributes('aria-expanded') === 'false')).toBe(true)

    await rows[0].trigger('click')
    await flushPromises()
    expect(w.findAll('button[aria-expanded]')[0].attributes('aria-expanded')).toBe('true')
    expect(w.text()).toContain('holed out from the car park')

    // Opening another closes the first, so expanded cups can't stack up — and a closed
    // panel leaves the DOM entirely, so its links can't be tabbed into.
    await w.findAll('button[aria-expanded]')[1].trigger('click')
    await flushPromises()
    expect(w.findAll('button[aria-expanded]').map((r) => r.attributes('aria-expanded'))).toEqual(['false', 'true'])
    expect(w.text()).not.toContain('holed out from the car park')
    expect(w.text()).toContain('No biography was written this year.')
  })

  it('closes an open cup when its own row is tapped again', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    const row = () => w.findAll('button[aria-expanded]')[0]
    await row().trigger('click')
    await flushPromises()
    expect(row().attributes('aria-expanded')).toBe('true')
    await row().trigger('click')
    await flushPromises()
    expect(row().attributes('aria-expanded')).toBe('false')
  })
})

describe('PlayerView stats tab', () => {
  beforeEach(async () => {
    router.push('/players/p1')
    await router.isReady()
  })

  it('reports points as a rate, since everyone plays every format', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Stats')!
      .trigger('click')
    await flushPromises()
    // 3 points over 2 cups. The career total is shown beside it, not instead of it.
    expect(w.text()).toContain('1.50')
    expect(w.text()).toContain('Points per cup')
  })

  it('leaves out pairings played only once — one match is a coin toss, not a record', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Stats')!
      .trigger('click')
    await flushPromises()
    // Sections are folded, so open Partners before reading it.
    await w
      .findAll('button[aria-expanded]')
      .find((b) => b.text().includes('Partners'))!
      .trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Cam Macaulay') // paired 3 times
    expect(w.text()).not.toContain('One Off') // paired once
  })

  it('splits matches that went the distance from ones closed out early', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Stats')!
      .trigger('click')
    await flushPromises()
    await w
      .findAll('button[aria-expanded]')
      .find((b) => b.text().includes('Under pressure'))!
      .trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Went to the 18th')
    expect(w.text()).toContain('1–1–0')
    expect(w.text()).toContain('2–0–0')

    // Margins render through resultText, so they read as they do on a scorecard: a match
    // with holes left is "9 & 7", one settled on the last green is "5 up".
    expect(w.text()).toContain('9 & 7 over Phin')
    expect(w.text()).toContain('5 up to Macaulay / Ray')
  })

  it('opens one stats section at a time, so the page stays scannable', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Stats')!
      .trigger('click')
    await flushPromises()

    const sections = () => w.findAll('button[aria-expanded]')
    // By format leads, so the tab never opens on an empty page.
    expect(
      sections()
        .find((b) => b.text().includes('By format'))!
        .attributes('aria-expanded'),
    ).toBe('true')

    await sections()
      .find((b) => b.text().includes('Opponents'))!
      .trigger('click')
    await flushPromises()
    const open = sections().filter((b) => b.attributes('aria-expanded') === 'true')
    expect(open).toHaveLength(1)
    expect(open[0].text()).toContain('Opponents')
  })
})
