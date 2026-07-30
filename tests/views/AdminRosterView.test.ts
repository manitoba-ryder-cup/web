import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentPlayers: vi.fn(),
    listPlayers: vi.fn(),
    enterTournamentPlayer: vi.fn(),
    updateTournamentPlayer: vi.fn(),
  },
}))

import { scorecardApi } from '@/api/scorecard'
import AdminRosterView from '@/views/admin/AdminRosterView.vue'

const entry = (over: Partial<Record<string, unknown>> = {}) => ({
  tournament_id: 't1',
  player_id: 'p1',
  tier: 'gold',
  biography: 'Long drive, short temper.',
  hdcp: 4.5,
  first_name: 'Jane',
  last_name: 'Doe',
  photo_path: '',
  team_id: null,
  record: { wins: 0, losses: 0, ties: 0 },
  cups_won: 0,
  ...over,
})

const mountView = () => mount(AdminRosterView, { props: { id: 't1' } })
const openFirstRow = async (w: ReturnType<typeof mount>) => {
  await w.find('button[aria-expanded]').trigger('click')
  await flushPromises()
}

describe('AdminRosterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([entry()] as never)
    vi.mocked(scorecardApi.listPlayers).mockResolvedValue([
      {
        id: 'p1',
        user_id: null,
        first_name: 'Jane',
        last_name: 'Doe',
        photo_path: '',
        record: { wins: 0, losses: 0, ties: 0 },
        cups_won: 0,
      },
      {
        id: 'p2',
        user_id: null,
        first_name: 'Rory',
        last_name: 'McIlroy',
        photo_path: '',
        record: { wins: 0, losses: 0, ties: 0 },
        cups_won: 0,
      },
    ] as never)
    vi.mocked(scorecardApi.updateTournamentPlayer).mockResolvedValue(entry() as never)
    vi.mocked(scorecardApi.enterTournamentPlayer).mockResolvedValue(entry() as never)
  })

  it('lists who is entered', async () => {
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('Jane Doe')
    expect(w.text()).toContain('1 entered')
  })

  // Entering the same player twice is a 409, so an already-entered player would only ever
  // produce an error someone has to read.
  it('offers only players who are not entered yet', async () => {
    const w = mountView()
    await flushPromises()
    const options = w.find('#add-player').findAll('option')
    expect(options.map((o) => o.text())).toEqual(['Choose a player…', 'Rory McIlroy'])
  })

  // The whole reason the API update is partial: whoever writes a biography has no reason
  // to know the handicap, and sending the entry back whole is how it gets lost.
  it('sends only the biography when only the biography changed', async () => {
    const w = mountView()
    await flushPromises()
    await openFirstRow(w)

    await w.find('textarea').setValue('Rewritten.')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Save')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.updateTournamentPlayer).toHaveBeenCalledWith('t1', 'p1', { biography: 'Rewritten.' })
  })

  it('sends only the flight when only the flight changed', async () => {
    const w = mountView()
    await flushPromises()
    await openFirstRow(w)

    await w.find('#tier-p1').setValue('blue')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Save')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.updateTournamentPlayer).toHaveBeenCalledWith('t1', 'p1', { tier: 'blue' })
  })

  it('keeps Save disabled until something changes', async () => {
    const w = mountView()
    await flushPromises()
    await openFirstRow(w)

    const save = () => w.findAll('button').find((b) => b.text() === 'Save')!
    expect(save().attributes('disabled')).toBeDefined()

    await w.find('textarea').setValue('Something new.')
    expect(save().attributes('disabled')).toBeUndefined()
  })

  // A handicap of 0 is scratch, not "unset" — it has to survive being typed.
  it('sends a handicap of zero', async () => {
    const w = mountView()
    await flushPromises()
    await openFirstRow(w)

    await w.find('#hdcp-p1').setValue('0')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Save')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.updateTournamentPlayer).toHaveBeenCalledWith('t1', 'p1', { hdcp: 0 })
  })

  it('enters a player and refetches', async () => {
    const w = mountView()
    await flushPromises()

    await w.find('#add-player').setValue('p2')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(scorecardApi.enterTournamentPlayer).toHaveBeenCalledWith('t1', { player_id: 'p2' })
    expect(scorecardApi.getTournamentPlayers).toHaveBeenCalledTimes(2)
  })

  // Opening a second row must not carry the first row's half-typed edit across.
  it('reloads the draft from the row being opened', async () => {
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([
      entry(),
      entry({ player_id: 'p2', first_name: 'Rory', last_name: 'McIlroy', tier: 'blue', biography: 'Quiet.', hdcp: 1 }),
    ] as never)
    const w = mountView()
    await flushPromises()

    await openFirstRow(w)
    await w.find('textarea').setValue('Half-typed.')

    // Doe sorts before McIlroy, so the second header is Rory's.
    await w.findAll('button[aria-expanded]')[1].trigger('click')
    await flushPromises()

    expect((w.find('textarea').element as HTMLTextAreaElement).value).toBe('Quiet.')
  })
})
