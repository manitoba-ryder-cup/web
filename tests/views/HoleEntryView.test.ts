import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ApiError, type MatchResult, type MatchStatus } from '@/api/types'

const teams = [
  { id: 'blue', color: 'Blue', captain: null, points: 0 },
  { id: 'red', color: 'Red', captain: null, points: 0 },
]
const match: MatchResult = {
  match_id: 'm1',
  format_name: 'Singles',
  finished: false,
  winner_team_id: null,
  leader_team_id: null,
  lead: 0,
  holes_remaining: 18,
  sides: [
    { team_id: 'blue', players: [{ player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' }] },
    { team_id: 'red', players: [{ player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' }] },
  ],
  hole_results: [],
  tee_time: null,
  course_name: 'Clear Lake',
}
const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, hdcp: i + 1, yards: 400 }))
const open: MatchStatus = { finished: false, winner_team_id: null, leader_team_id: 'blue', lead: 1, holes_remaining: 10 }
const closedOut: MatchStatus = { finished: true, winner_team_id: 'blue', leader_team_id: 'blue', lead: 4, holes_remaining: 3 }

const toasts: string[] = []
vi.mock('@/composables/useToast', () => ({
  toast: { success: (m: string) => toasts.push(m), error: (m: string) => toasts.push(m) },
}))

const submitScore = vi.fn()
const getMatchScores = vi.fn(() => Promise.resolve([]))
vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentTeams: vi.fn(() => Promise.resolve(teams)),
    getTournamentResults: vi.fn(() => Promise.resolve([match])),
    getMatchHoles: vi.fn(() => Promise.resolve(holes)),
    getMatchScores: () => getMatchScores(),
    submitHoleScores: (...args: unknown[]) => submitScore(...args),
  },
}))

import HoleEntryView from '@/views/HoleEntryView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
  ],
})

// The score wheel's stroke tiles are buttons too, so the save button is the one that
// isn't a tile.
function saveButton(w: ReturnType<typeof mount>) {
  return w.findAll('button').filter((b) => b.attributes('data-tile') === undefined)[0]
}

async function openHole(hole = '15') {
  router.push(`/t/t1/m/m1/h/${hole}`)
  await router.isReady()
  const w = mount(HoleEntryView, { props: { tournamentId: 't1', matchId: 'm1', hole }, global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('HoleEntryView saving', () => {
  beforeEach(() => {
    submitScore.mockReset()
    getMatchScores.mockClear()
    toasts.length = 0
    match.finished = false
  })
  // Spies here stub the router; a leaked one silently redirects the next test.
  afterEach(() => vi.restoreAllMocks())

  it('walks to the next hole while the match is still live', async () => {
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledTimes(1) // the whole hole in one write
    expect(router.currentRoute.value.name).toBe('hole')
    expect(router.currentRoute.value.params.hole).toBe('16')
  })

  it("sends every side's score for the hole in one request", async () => {
    // Both sides in one body is what makes the write atomic — a half-scored hole stops
    // being reachable, rather than being something the reader has to cope with.
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledWith('m1', {
      hole_number: 15,
      scores: [
        { team_id: 'blue', player_id: 'p1', strokes: 4 },
        { team_id: 'red', player_id: 'p2', strokes: 4 },
      ],
    })
  })

  it('refetches the match after a save, so the next hole is not built from a stale snapshot', async () => {
    // The page loads once. Without a refetch the scores just written are invisible to it:
    // revisiting the hole shows par again, and saving from there overwrites them.
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')
    expect(getMatchScores).toHaveBeenCalledTimes(1)

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(getMatchScores).toHaveBeenCalledTimes(2)
  })

  it('goes to the scorecard when the hole closes the match out', async () => {
    // The write says the match ended, so there is no hole 16 to walk to — without this
    // the stale mount-time `finished` would march on and keep offering entry.
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    // Landing somewhere other than the next hole needs explaining.
    expect(toasts.at(-1)).toBe('Match complete — Rabe win 4 & 3')
  })

  it('says nothing when the save was an ordinary one', async () => {
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(toasts).toHaveLength(0)
  })

  it('stays disabled until the navigation lands', async () => {
    // The button re-enabling mid-transition let a second tap fire goNext() on a match the
    // save had just finished, pushing hole 16 in behind the scorecard.
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')
    const push = vi.spyOn(router, 'push').mockReturnValue(new Promise(() => {})) // never lands

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledTimes(1)
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('reports a 409 and locks the wheels instead of a bare save error', async () => {
    submitScore.mockRejectedValue(new ApiError(409, 'match is complete'))
    const w = await openHole('16')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(w.text()).toContain('already complete')
    expect(router.currentRoute.value.params.hole).toBe('16')
    // The button stops offering to save once the view knows the match is over.
    expect(saveButton(w).text()).toBe('Next Hole')
  })

  it('does not write at all for a match that was already finished on load', async () => {
    match.finished = true
    const w = await openHole('16')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(submitScore).not.toHaveBeenCalled()
  })
})
