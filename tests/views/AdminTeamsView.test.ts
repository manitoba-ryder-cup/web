import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentPlayers: vi.fn(),
    getTournamentTeams: vi.fn(),
    draftPlayer: vi.fn(),
    undraftPlayer: vi.fn(),
    setTeamCaptain: vi.fn(),
    clearTeamCaptain: vi.fn(),
  },
}))

import { createPinia, setActivePinia } from 'pinia'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import AdminTeamsView from '@/views/admin/AdminTeamsView.vue'

const player = (o: Partial<TournamentPlayer> = {}): TournamentPlayer => ({
  tournament_id: 't1',
  player_id: 'p1',
  tier: 'gold',
  biography: '',
  hdcp: 4,
  first_name: 'Amy',
  last_name: 'Smith',
  photo_path: '',
  team_id: null,
  record: { wins: 0, losses: 0, ties: 0 },
  cups_won: 0,
  ...o,
})

const TEAMS = [
  { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
  { id: 'red-1', color: 'Red', captain: null, points: 0 },
]

const mountIt = async () => {
  const w = mount(AdminTeamsView, { props: { id: 't1' } })
  await flushPromises()
  return w
}
// The chips are the page's tally, so they are how the list says where someone ended up.
const chip = (w: ReturnType<typeof mount>, label: string) =>
  w
    .findAll('button')
    .find((b) => b.text().startsWith(label))
    ?.text()
    .replace(/\s+/g, ' ')
const teamButton = (w: ReturnType<typeof mount>, colour: string) => w.findAll('button').find((b) => b.text() === colour)!

// Held so a test can choose whether the server has caught up: released, the list agrees
// because it was re-read; blocked, anything on screen got there optimistically.
let releaseRefetch: (() => void) | null = null
function blockRefetchesAfterTheFirst() {
  let servedRoster = 0
  vi.mocked(scorecardApi.getTournamentPlayers).mockImplementation(() =>
    servedRoster++ === 0 ? Promise.resolve(roster) : new Promise<TournamentPlayer[]>((resolve) => (releaseRefetch = () => resolve(roster))),
  )
  // Both, because the roster and the teams are separate resources: holding one no longer
  // holds the other, and the captain lives on a team.
  let servedTeams = 0
  const held = vi.mocked(scorecardApi.getTournamentTeams).getMockImplementation()
  vi.mocked(scorecardApi.getTournamentTeams).mockImplementation((id: string) =>
    servedTeams++ === 0 ? (held?.(id) ?? Promise.resolve([])) : new Promise(() => {}),
  )
}

let roster: TournamentPlayer[] = []

describe('AdminTeamsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    releaseRefetch = null
    roster = [player()]
    vi.mocked(scorecardApi.getTournamentPlayers).mockImplementation(() => Promise.resolve(roster))
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue(TEAMS)
    vi.mocked(scorecardApi.draftPlayer).mockResolvedValue(undefined)
    vi.mocked(scorecardApi.undraftPlayer).mockResolvedValue(undefined)
    vi.mocked(scorecardApi.setTeamCaptain).mockResolvedValue(undefined)
    vi.mocked(scorecardApi.clearTeamCaptain).mockResolvedValue(undefined)
  })

  // Mounted without awaiting, so the assertion lands in the window the skeleton covers.
  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(AdminTeamsView, { props: { id: 't1' } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No players match.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Smith')
  })

  // A query hands back a readonly view of the cache, so an optimistic update written through it
  // is dropped in silence: the draft succeeds and the page still reads Unassigned 1.
  it('moves the row onto the team before the server has been re-read', async () => {
    blockRefetchesAfterTheFirst()
    const w = await mountIt()
    expect(chip(w, 'Unassigned')).toBe('Unassigned 1')

    await teamButton(w, 'Blue').trigger('click')
    await flushPromises()

    // The refetch is still out, so this can only be the optimistic update.
    expect(releaseRefetch).not.toBeNull()
    expect(scorecardApi.draftPlayer).toHaveBeenCalledWith('blue-1', 'p1')
    expect(chip(w, 'Blue')).toBe('Blue 1')
    expect(chip(w, 'Unassigned')).toBe('Unassigned 0')
  })

  it('agrees with the server once it has been re-read', async () => {
    const w = await mountIt()

    roster = [player({ team_id: 'blue-1' })]
    await teamButton(w, 'Blue').trigger('click')
    await flushPromises()

    expect(vi.mocked(scorecardApi.getTournamentPlayers).mock.calls.length).toBeGreaterThan(1)
    expect(chip(w, 'Blue')).toBe('Blue 1')
  })

  it('undrafts before drafting when a player changes sides', async () => {
    roster = [player({ team_id: 'blue-1' })]
    blockRefetchesAfterTheFirst()
    const w = await mountIt()

    await teamButton(w, 'Red').trigger('click')
    await flushPromises()

    expect(scorecardApi.undraftPlayer).toHaveBeenCalledWith('blue-1', 'p1')
    expect(chip(w, 'Red')).toBe('Red 1')
    expect(chip(w, 'Blue')).toBe('Blue 0')
  })

  it('shows the captain on the team once it is set', async () => {
    roster = [player({ team_id: 'blue-1' })]
    blockRefetchesAfterTheFirst()
    const w = await mountIt()

    await w
      .findAll('button')
      .find((b) => b.attributes('title') === 'Make captain')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.setTeamCaptain).toHaveBeenCalledWith('blue-1', 'p1')
    expect(w.findAll('button').some((b) => b.attributes('title') === 'Captain — tap to clear')).toBe(true)
  })

  // A half-applied move must not leave the list claiming something the server didn't take.
  it('leaves the row where it was when the draft fails', async () => {
    vi.mocked(scorecardApi.draftPlayer).mockRejectedValue(new Error('offline'))
    const w = await mountIt()

    await teamButton(w, 'Blue').trigger('click')
    await flushPromises()

    expect(chip(w, 'Blue')).toBe('Blue 0')
    expect(chip(w, 'Unassigned')).toBe('Unassigned 1')
  })
})
