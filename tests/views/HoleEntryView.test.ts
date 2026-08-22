import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory, useRoute } from 'vue-router'
import { defineComponent, h } from 'vue'
import { ApiError, type HoleStatus, type MatchResult, type MatchStatus } from '@/api/types'

const teams = [
  { id: 'blue', color: 'Blue', captain: null, points: 0 },
  { id: 'red', color: 'Red', captain: null, points: 0 },
]
// The scoring window runs from 2h before the tee time to 12h after, so a match's own tee
// time is what puts it in the future, under way, or long over.
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString()
const teeingOffNow = hoursFromNow(0)
const teeingOffIn60Days = hoursFromNow(24 * 60)
const playedLastYear = hoursFromNow(-24 * 365)

// The API sends the window alongside the tee time, so a fixture that moves a match in
// time has to move its window too — setting tee_time alone would leave the gate behind.
const withWindow = <T extends { tee_time: string }>(m: T, teeTime: string): T => ({
  ...m,
  tee_time: teeTime,
  scoring_opens_at: new Date(new Date(teeTime).getTime() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(new Date(teeTime).getTime() + 12 * 3600000).toISOString(),
})

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
  tee_time: teeingOffNow,
  scoring_opens_at: new Date(new Date(teeingOffNow).getTime() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(new Date(teeingOffNow).getTime() + 12 * 3600000).toISOString(),
  course_name: 'Clear Lake',
}
const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, hdcp: i + 1, yards: 400 }))
// The 15th as it was played: a hole the match already carries a score for, which is what
// separates correcting one from extending a decided match onto a hole it never reached.
const scoredFifteenth: HoleStatus = {
  hole_number: 15,
  team_scores: [
    { team_id: 'blue', strokes: 5, player_scores: [{ player_id: 'p1', strokes: 5 }] },
    { team_id: 'red', strokes: 4, player_scores: [{ player_id: 'p2', strokes: 4 }] },
  ],
  leader_team_id: 'red',
  lead: 4,
  holes_remaining: 3,
  decided: true,
}
const open: MatchStatus = { finished: false, winner_team_id: null, leader_team_id: 'blue', lead: 1, holes_remaining: 10 }
const closedOut: MatchStatus = { finished: true, winner_team_id: 'blue', leader_team_id: 'blue', lead: 4, holes_remaining: 3 }

const toasts: string[] = []
vi.mock('@/composables/useToast', () => ({
  toast: { success: (m: string) => toasts.push(m), error: (m: string) => toasts.push(m) },
}))

const submitScore = vi.fn()
let holeStates: HoleStatus[] = []
const getMatchScores = vi.fn(() => Promise.resolve(holeStates))
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
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_SCORES_WRITE } from '@/api/scopes'
import { tokenWithScopes } from '../support/token'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
  ],
})

// The stroke strip's tiles are buttons too, so the save button is the one that
// isn't a tile.
function saveButton(w: ReturnType<typeof mount>) {
  return w.findAll('button').filter((b) => b.attributes('data-stroke') === undefined)[0]
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
    // Recording a hole needs the scope; the tests below are all about what a scorer sees.
    setActivePinia(createPinia())
    useAuthStore().accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])
    Object.assign(match, withWindow(match, teeingOffNow))
    submitScore.mockReset()
    getMatchScores.mockClear()
    holeStates = []
    toasts.length = 0
    match.finished = false
  })
  // Spies here stub the router; a leaked one silently redirects the next test.
  afterEach(() => vi.restoreAllMocks())

  // A spectator reads a hole — that is the public half of this page — and is offered no
  // way to record one. Same shape as a played cup: the scores show, nothing can be tapped.
  it('reads a live hole read-only when the token cannot score', async () => {
    useAuthStore().accessToken = tokenWithScopes([])
    const w = await openHole('15')

    expect(w.text()).not.toContain("hasn't started yet")
    expect(w.find('[data-stroke]').exists()).toBe(true)
    expect(saveButton(w).text()).not.toContain('Save')
  })

  it('shows the entry shape while loading rather than an empty screen', async () => {
    // Deliberately not `openHole()`: it flushes, and this asserts pre-flush.
    router.push('/t/t1/m/m1/h/15')
    await router.isReady()
    const w = mount(HoleEntryView, {
      props: { tournamentId: 't1', matchId: 'm1', hole: '15' },
      global: { plugins: [router] },
    })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Hole not found.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
  })

  it('refuses to offer a strip before the cup is played', async () => {
    // A match months out is only ever being poked at; the server refuses the write too,
    // so offering the strips would only produce an error on save.
    Object.assign(match, withWindow(match, teeingOffIn60Days))

    const w = await openHole('1')

    expect(w.text()).toContain("hasn't started yet")
    expect(w.find('[data-stroke]').exists()).toBe(false)
  })

  it('still shows a played cup, read-only rather than "not started"', async () => {
    // Scoring is shut for last year's cup the same as for one months away, but they are
    // opposite situations to a reader: one has every score, the other has none.
    Object.assign(match, withWindow(match, playedLastYear))

    const w = await openHole('5')

    expect(w.text()).not.toContain("hasn't started yet")
    expect(w.find('[data-stroke]').exists()).toBe(true)
    expect(saveButton(w).text()).not.toContain('Save')
  })

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

  it('reports a 409 and locks the strips instead of a bare save error', async () => {
    submitScore.mockRejectedValue(new ApiError(409, 'match is complete'))
    const w = await openHole('16')

    await saveButton(w).trigger('click')
    await flushPromises()

    // True of both refusals the server answers 409 with — a shut window, and a hole a decided
    // match never reached — because this cannot tell them apart.
    expect(w.text()).toContain('closed to scoring')
    expect(router.currentRoute.value.params.hole).toBe('16')
    // The button stops offering to save once the view knows the match is over.
    expect(saveButton(w).text()).toBe('Next Hole')
  })

  it('does not extend a finished match onto a hole it never played', async () => {
    match.finished = true
    const w = await openHole('16')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(submitScore).not.toHaveBeenCalled()
  })

  it('still corrects a hole a finished match was played over', async () => {
    // The server takes corrections to the holes a decided match was played over until its
    // window shuts, and a typo can be what closed it out early — so the strips stay live.
    match.finished = true
    holeStates = [scoredFifteenth]
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')

    expect(saveButton(w).text()).toContain('Save')

    await saveButton(w).trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledTimes(1)
  })

  // Covers arriving by a shared link or a typed URL, not just a tap on the card.
  it('sends someone away from a hole a finished match never reached', async () => {
    match.finished = true
    holeStates = [scoredFifteenth]

    await openHole('16')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })

  it('sends a spectator to the card rather than a wheel they cannot turn', async () => {
    setActivePinia(createPinia())

    await openHole('15')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })

  // A hole off the card has nothing behind it either, and used to dead-end on "Hole not
  // found." rather than going anywhere.
  it('sends someone away from a hole that is not on the card', async () => {
    await openHole('25')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })

  // "Not yet" and "not ever" are different answers. A link to a match that has not gone off
  // should say when it does, not bounce to a card with nothing on it.
  it('keeps the tee time reachable for a match that has not started', async () => {
    match.scoring_opens_at = new Date(Date.now() + 60 * 24 * 3600000).toISOString()
    const w = await openHole('15')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('hole')
    expect(w.text()).toContain("hasn't started yet")
  })
})

// Mounted the way the router does it, so `hole` follows the URL. Walking forward reuses
// the component, which is the path a test with a fixed prop cannot see.
describe('HoleEntryView walking forward', () => {
  const Host = defineComponent({
    setup() {
      const route = useRoute()
      return () =>
        route.name === 'hole'
          ? h(HoleEntryView, {
              tournamentId: String(route.params.tournamentId),
              matchId: String(route.params.matchId),
              hole: String(route.params.hole),
            })
          : h('div', 'card')
    },
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])
    vi.clearAllMocks()
    toasts.length = 0
    holeStates = []
    match.finished = false
    match.scoring_opens_at = new Date(new Date(teeingOffNow).getTime() - 2 * 3600000).toISOString()
  })

  // A refusal belongs to the hole it happened on. Carried forward, one 409 switches the
  // redirect off for the rest of the walk and leaves the inert wheel behind.
  it('does not let one refusal keep the wheel open on every hole after it', async () => {
    // The stale tab: the match was live when this hole was opened and finished underneath.
    submitScore.mockRejectedValue(new ApiError(409, 'match is complete'))
    router.push('/t/t1/m/m1/h/16')
    await router.isReady()
    const w = mount(Host, { global: { plugins: [router] } })
    await flushPromises()

    await saveButton(w).trigger('click')
    await flushPromises()
    expect(w.text()).toContain('closed to scoring')
    expect(router.currentRoute.value.name).toBe('hole') // the refusal stays readable

    // "Next Hole" walks to 17, which the match never reached and cannot take.
    await saveButton(w).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })
})
