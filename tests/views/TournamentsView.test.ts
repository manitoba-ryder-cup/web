import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: { listTournaments: vi.fn(), listPlayers: vi.fn(), getTournamentTeams: vi.fn() },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import TournamentsView from '@/views/TournamentsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/tournaments', component: { template: '<div/>' } },
    { path: '/tournaments/:id', name: 'tournament', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
  ],
})

async function loaded() {
  const w = mount(TournamentsView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

// Each half fetches when it is first shown, so opening a tab is a load: flush after the
// click or the assertion reads the skeleton.
const clickTab = async (w: Awaited<ReturnType<typeof loaded>>, label: string) => {
  await w
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click')
  await flushPromises()
}

describe('TournamentsView', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Awaited: the router is shared across these cases and a tab click writes the hash, so
    // an un-awaited reset leaves the previous test opening this one on Participants.
    await router.push('/tournaments')
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2019-07-01', end_date: '2019-07-03', location: 'Winnipeg' },
      { id: 't2', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Gimli' },
    ])
    // Deliberately out of order, so a page that echoed the server's order would fail.
    vi.mocked(scorecardApi.listPlayers).mockResolvedValue([
      {
        id: 'p2',
        user_id: null,
        first_name: 'Ada',
        last_name: 'Winterhalt',
        photo_path: '',
        record: { wins: 3, losses: 1, ties: 0 },
        cups_won: 2,
      },
      {
        id: 'p1',
        user_id: null,
        first_name: 'Gus',
        last_name: 'Bygone',
        photo_path: '',
        record: { wins: 0, losses: 2, ties: 0 },
        cups_won: 0,
      },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([])
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(TournamentsView, { global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    // Both halves' empty text is a claim about loaded data; neither may leak into the load.
    expect(w.text()).not.toContain('No tournaments yet.')
    expect(w.text()).not.toContain('No players yet.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    // TournamentCard leads with the year and location, not the tournament's name.
    expect(w.text()).toContain('Gimli')
  })

  // Page chrome, not a claim about data, so it is there before the archive loads — and it
  // is the only thing on the page the bottom nav does not already say.
  it("carries the event's line in the hero from the first frame", () => {
    const w = mount(TournamentsView, { global: { plugins: [router] } })

    expect(w.text()).toContain('An Event Like No Other')
  })

  it('opens on the cups, newest first', async () => {
    const w = await loaded()

    expect(w.text()).toContain('Gimli')
    expect(w.text()).not.toContain('Bygone')
    // Newest first, so the most recent cup leads rather than the first one ever played.
    expect(w.text().indexOf('Gimli')).toBeLessThan(w.text().indexOf('Winnipeg'))
  })

  it('lists everyone who has played on the other tab', async () => {
    const w = await loaded()

    await clickTab(w, 'Participants')

    expect(w.text()).not.toContain('Gimli')
    // Sorted by surname, not the order the server happened to return.
    expect(w.text().indexOf('Bygone')).toBeLessThan(w.text().indexOf('Winterhalt'))
  })

  // The profile's back link is a pure function of the route, so the card has to say where
  // it was tapped for the header to offer History rather than this year's roster.
  it('marks a participant link with where it came from', async () => {
    const w = await loaded()

    await clickTab(w, 'Participants')

    const link = w.findAll('a').find((a) => a.text().includes('Bygone'))
    expect(link?.attributes('href')).toContain('from=history')
  })

  // Two fetches, so the tab that opens does not wait on — or go down with — the list on the
  // other one. The cups are the page's primary content and have no dependency on the roll.
  it('keeps the cups readable when the participants list fails', async () => {
    vi.mocked(scorecardApi.listPlayers).mockRejectedValue(new Error('offline'))
    const w = await loaded()

    expect(w.text()).toContain('Gimli')

    await clickTab(w, 'Participants')

    expect(w.text()).toContain('offline')
    expect(w.text()).not.toContain('No players yet.')
  })

  // And the other way: a failure on the cups leaves a working page rather than an empty
  // one, with the retry the field needs on it.
  it('offers a retry on the half that failed', async () => {
    vi.mocked(scorecardApi.listTournaments).mockRejectedValue(new Error('offline'))
    const w = await loaded()

    expect(w.text()).not.toContain('No tournaments yet.')
    expect(w.findAll('button').some((b) => b.text() === 'Try again')).toBe(true)

    await clickTab(w, 'Participants')

    expect(w.text()).toContain('Bygone')
  })

  // The cups are what the page opens on; the roll is the longer list and the half most
  // visitors never ask for. Fetching it anyway is a request nobody made.
  it('leaves the participants list alone until someone opens it', async () => {
    const w = await loaded()

    expect(scorecardApi.listPlayers).not.toHaveBeenCalled()

    await clickTab(w, 'Participants')

    expect(scorecardApi.listPlayers).toHaveBeenCalledTimes(1)
  })

  // And once it has loaded, coming back to it shows what it already has rather than
  // spending the request again.
  it('does not re-fetch a tab it has already loaded', async () => {
    const w = await loaded()
    await clickTab(w, 'Participants')
    await clickTab(w, 'Tournaments')
    await clickTab(w, 'Participants')

    expect(scorecardApi.listPlayers).toHaveBeenCalledTimes(1)
    expect(scorecardApi.listTournaments).toHaveBeenCalledTimes(1)
    expect(w.text()).toContain('Bygone')
  })

  // Awaited: the component has to mount with the hash already resolved, the way router-view
  // mounts it. Left un-awaited it mounts on the cups and only flips once the navigation
  // drains — which fetches the archive too, and would pass whether or not the hash reached
  // the first frame.
  it('opens on the tab the hash names, without loading the other one', async () => {
    await router.push('/tournaments#participants')
    const w = await loaded()

    expect(w.text()).toContain('Bygone')
    expect(scorecardApi.listTournaments).not.toHaveBeenCalled()
  })
})
