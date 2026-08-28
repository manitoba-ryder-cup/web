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
  players_per_side: 1,
  scores_per_player: true,
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
// What the fixture is when a test has not changed it — the reset below puts it back.
const singles = { format_name: match.format_name, scores_per_player: match.scores_per_player, sides: match.sides }
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
import { CardStub } from '../support/cardStub'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/t/:tournamentId/m/:matchId', name: 'match', component: { template: '<div/>' } },
    { path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } },
  ],
})

// The stroke tiles and the pager's chevrons are buttons too; the one that submits is neither,
// and is found by shape because its label varies. Undefined when the hole cannot be recorded.
function saveButton(w: ReturnType<typeof mount>) {
  return w.findAll('button').find((b) => b.attributes('data-stroke') === undefined && b.attributes('aria-label') === undefined)
}
const chevron = (w: ReturnType<typeof mount>, dir: 'Previous' | 'Next') => w.get(`[aria-label="${dir} hole"]`)
// An unrecorded hole opens with nothing chosen, so anything that saves has to choose first —
// the taps a scorer makes.
async function pick(w: ReturnType<typeof mount>, strokes = 4) {
  for (const strip of w.findAll('[role="radiogroup"]')) await strip.findAll('[data-stroke]')[strokes - 1].trigger('click')
  await flushPromises()
}
const stepBlocked = (w: ReturnType<typeof mount>, dir: 'Previous' | 'Next') => chevron(w, dir).attributes('aria-disabled') === 'true'

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
    Object.assign(match, { finished: false, leader_team_id: null, lead: 0, ...singles })
  })
  // Spies here stub the router; a leaked one silently redirects the next test.
  afterEach(() => vi.restoreAllMocks())

  // The card holds its own copy of the match; refreshing only the entry page's leaves it
  // showing what it had until its next poll.
  it('refreshes the card behind it, not just its own copy of the match', async () => {
    const card = mount(CardStub, { global: { plugins: [router] } })
    await flushPromises()
    expect(card.text()).toBe('0')

    // The hole lands, so the next read of either copy has one scored hole in it.
    holeStates = [scoredFifteenth]
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')
    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(card.text()).toBe('1')
  })

  // A spectator reads a hole — that is the public half of this page — and is offered no
  // way to record one. Same shape as a played cup: the scores show, nothing can be tapped.
  it('reads a live hole read-only when the token cannot score', async () => {
    useAuthStore().accessToken = tokenWithScopes([])
    const w = await openHole('15')

    expect(w.text()).not.toContain("hasn't started yet")
    expect(w.find('[data-stroke]').exists()).toBe(true)
    expect(saveButton(w)).toBeUndefined()
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
    expect(saveButton(w)).toBeUndefined()
  })

  // A one-ball format fields two a side and records one score for the pair, so a strip each
  // would offer four scores where the server takes two — and it takes them without complaint.
  it('offers one strip a side for a format that records one ball', async () => {
    Object.assign(match, {
      format_name: 'Alt Shot',
      players_per_side: 2,
      scores_per_player: false,
      sides: [
        {
          team_id: 'blue',
          players: [
            { player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' },
            { player_id: 'p3', first_name: 'Keith', last_name: 'Van Walleghem' },
          ],
        },
        {
          team_id: 'red',
          players: [
            { player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' },
            { player_id: 'p4', first_name: 'Connor', last_name: 'Macaulay' },
          ],
        },
      ],
    })
    submitScore.mockResolvedValue(open)

    const w = await openHole('15')
    expect(w.findAll('[role="radiogroup"]')).toHaveLength(2)

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    // One score per side, and no player named: the pair played one ball between them.
    expect(submitScore).toHaveBeenCalledWith('m1', {
      hole_number: 15,
      scores: [
        { team_id: 'blue', player_id: null, strokes: 4 },
        { team_id: 'red', player_id: null, strokes: 4 },
      ],
    })
  })

  it('goes back to the scorecard once the hole is saved', async () => {
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledTimes(1) // the whole hole in one write
    expect(router.currentRoute.value.name).toBe('match')
    expect(router.currentRoute.value.hash).toBe('#hole-15')
  })

  it("sends every side's score for the hole in one request", async () => {
    // Both sides in one body is what makes the write atomic. A double rather than the par
    // the strip parks on, so the body cannot be something nobody chose.
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await pick(w, 6)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledWith('m1', {
      hole_number: 15,
      scores: [
        { team_id: 'blue', player_id: 'p1', strokes: 6 },
        { team_id: 'red', player_id: 'p2', strokes: 6 },
      ],
    })
  })

  // The offer an unplayed hole opens with, taken as it stands.
  it('records par on a hole nobody has touched', async () => {
    const w = await openHole('15')

    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(submitScore).toHaveBeenCalledWith('m1', {
      hole_number: 15,
      scores: [
        { team_id: 'blue', player_id: 'p1', strokes: 4 },
        { team_id: 'red', player_id: 'p2', strokes: 4 },
      ],
    })
  })

  it('offers a save the moment an unplayed hole opens', async () => {
    const w = await openHole('15')

    expect(saveButton(w)!.attributes('disabled')).toBeUndefined()
  })

  // A recorded hole opens on its scores, so correcting one costs no taps it did not before.
  it('offers a save straight away on a hole already recorded', async () => {
    holeStates = [scoredFifteenth]

    const w = await openHole('15')

    expect(saveButton(w)!.attributes('disabled')).toBeUndefined()
  })

  it('offers Save on a hole with no score and Update on one already recorded', async () => {
    const fresh = await openHole('15')
    expect(saveButton(fresh)!.text()).toBe('Save')

    holeStates = [scoredFifteenth]
    const played = await openHole('15')

    expect(saveButton(played)!.text()).toBe('Update')
  })

  it('reports a failed update in the word the button offered', async () => {
    holeStates = [scoredFifteenth]
    submitScore.mockRejectedValue(new Error('offline'))
    const w = await openHole('15')

    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(w.text()).toContain('Update failed. Please try again.')
    expect(w.text()).not.toContain('Save failed')
  })

  it('refetches the match after a save, so what was written is what gets read', async () => {
    // The page loads once. Without a refetch the scores just written are invisible to it:
    // revisiting the hole reads as unrecorded, and the card behind it says the same.
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')
    expect(getMatchScores).toHaveBeenCalledTimes(1)

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(getMatchScores).toHaveBeenCalledTimes(2)
  })

  it('goes to the scorecard when the hole closes the match out', async () => {
    // The mount-time `finished` is stale the moment this write lands, and a hole the match
    // never reached must stop offering entry.
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
    // The card cannot say the match just ended; only the toast can.
    expect(toasts.at(-1)).toBe('Match complete — Rabe win 4 & 3')
  })

  it('says nothing when the save was an ordinary one', async () => {
    submitScore.mockResolvedValue(open)
    const w = await openHole('15')

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(toasts).toHaveLength(0)
  })

  it('stays disabled until the navigation lands', async () => {
    // The button re-enabling mid-transition let a second tap fire goNext() on a match the
    // save had just finished, pushing hole 16 in behind the scorecard.
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')
    const push = vi.spyOn(router, 'push').mockReturnValue(new Promise(() => {})) // never lands

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledTimes(1)
    expect(saveButton(w)!.attributes('disabled')).toBeDefined()
  })

  it('reports a 409 and locks the strips instead of a bare save error', async () => {
    submitScore.mockRejectedValue(new ApiError(409, 'match is complete'))
    const w = await openHole('16')

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()

    // True of both refusals the server answers 409 with — a shut window, and a hole a decided
    // match never reached — because this cannot tell them apart.
    expect(w.text()).toContain('closed to scoring')
    expect(router.currentRoute.value.params.hole).toBe('16')
    // Nothing left to offer: the hole will not take a score, so there is no Save to press.
    expect(saveButton(w)).toBeUndefined()
  })

  // A 4xx carries a sentence the server wrote for a reader; a 5xx carries whatever leaked out
  // of a failure, which is not an answer about this hole.
  it("shows the server's refusal, but never a fault's body", async () => {
    submitScore.mockRejectedValue(new ApiError(400, 'hole 15 already has a score for that player'))
    const w = await openHole('15')
    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('already has a score')

    submitScore.mockRejectedValue(new ApiError(500, 'pq: deadlock detected on relation scores'))
    const w2 = await openHole('15')
    await pick(w2)
    await saveButton(w2)!.trigger('click')
    await flushPromises()

    expect(w2.text()).not.toContain('deadlock')
    expect(w2.text()).toContain('Save failed. Please try again.')
  })

  it('does not extend a finished match onto a hole it never played', async () => {
    match.finished = true

    const w = await openHole('16')

    // No control to press rather than one that refuses: the hole will not take a score.
    expect(saveButton(w)).toBeUndefined()
    expect(submitScore).not.toHaveBeenCalled()
  })

  it('still corrects a hole a finished match was played over', async () => {
    // The server takes corrections to the holes a decided match was played over until its
    // window shuts, and a typo can be what closed it out early — so the strips stay live.
    match.finished = true
    holeStates = [scoredFifteenth]
    submitScore.mockResolvedValue(closedOut)
    const w = await openHole('15')

    expect(saveButton(w)).toBeDefined()

    await pick(w)
    await saveButton(w)!.trigger('click')
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

  // A running state read one hole at a time answers two questions — through this hole, or
  // into it — and cannot say which. The card's own column answers both, for all eighteen.
  it('leaves the match state to the card', async () => {
    Object.assign(match, { leader_team_id: 'blue', lead: 1 })
    holeStates = [scoredFifteenth]

    const w = await openHole('15')

    expect(w.text()).not.toContain('1 up')
  })

  it('will not step off either end of the card', async () => {
    expect(stepBlocked(await openHole('1'), 'Previous')).toBe(true)
    expect(stepBlocked(await openHole('18'), 'Next')).toBe(true)
  })

  it('will not step onto a hole a finished match never reached', async () => {
    // The step the page would answer by throwing you back to the card. Offering it as a live
    // chevron would make the tap look like the mistake.
    match.finished = true
    holeStates = [scoredFifteenth]

    const w = await openHole('15')

    expect(stepBlocked(w, 'Previous')).toBe(true)
    expect(stepBlocked(w, 'Next')).toBe(true)
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

// Mounted the way the router does it, so `hole` follows the URL. Stepping reuses the
// component, which is the path a test with a fixed prop cannot see.
describe('HoleEntryView stepping between holes', () => {
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
    Object.assign(match, { finished: false, ...singles })
    match.scoring_opens_at = new Date(new Date(teeingOffNow).getTime() - 2 * 3600000).toISOString()
  })

  // Not `open`: that is the module-level MatchStatus fixture this block's saves resolve with.
  async function openAt(hole: string) {
    router.push(`/t/t1/m/m1/h/${hole}`)
    await router.isReady()
    const w = mount(Host, { global: { plugins: [router] } })
    await flushPromises()
    return w
  }

  // Tapping the wrong row on the card is a slip a phone cannot prevent — there is no hover
  // to show which row is under the thumb — so correcting it must not cost a trip back.
  it('steps to the hole next door without going through the card', async () => {
    const w = await openAt('15')

    await chevron(w, 'Next').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.params.hole).toBe('16')
    expect(w.text()).toContain('HDCP 16')
  })

  it('steps back to the hole before it', async () => {
    const w = await openAt('15')

    await chevron(w, 'Previous').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.params.hole).toBe('14')
  })

  // Backing out of a correction should reach the card, not walk back through the holes
  // stepped over to make it.
  it('does not stack the steps up in history', async () => {
    const replace = vi.spyOn(router, 'replace')
    const w = await openAt('15')

    await chevron(w, 'Next').trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ name: 'hole' }))
  })

  // pointer-events keeps a thumb off a dead chevron, but it is styling, and styling is not
  // what should be deciding whether a step happens.
  it('does nothing when a dead chevron is pressed anyway', async () => {
    const w = await openAt('1')
    const replace = vi.spyOn(router, 'replace')

    await chevron(w, 'Previous').trigger('click')
    await flushPromises()

    // Not "the route did not change": a step to nowhere leaves it unchanged too, so this
    // has to be that no step was attempted.
    expect(replace).not.toHaveBeenCalled()
  })

  // Stepping while a write is in flight left the save reporting one hole and the card
  // scrolling to another, and threw the reader off the hole they had just stepped to.
  it('holds the step while a save is in flight', async () => {
    let land: (v: MatchStatus) => void = () => {}
    submitScore.mockReturnValue(new Promise<MatchStatus>((r) => (land = r)))
    const w = await openAt('15')
    await pick(w)

    await saveButton(w)!.trigger('click')
    await flushPromises()

    expect(chevron(w, 'Next').attributes('aria-disabled')).toBe('true')
    expect(chevron(w, 'Previous').attributes('aria-disabled')).toBe('true')

    await chevron(w, 'Next').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.params.hole).toBe('15')
    land(open)
    await flushPromises()

    // The hole the write was for, not whichever one the page had drifted to.
    expect(submitScore).toHaveBeenCalledWith('m1', expect.objectContaining({ hole_number: 15 }))
    expect(router.currentRoute.value.hash).toBe('#hole-15')
  })

  // The chevrons are held during a save, but the back button is not: the write still belongs
  // to the hole it was pressed on, and the card must be sent to that one.
  it('writes the hole it was pressed on when the route moves under it', async () => {
    let land: (v: MatchStatus) => void = () => {}
    submitScore.mockReturnValue(new Promise<MatchStatus>((r) => (land = r)))
    const w = await openAt('15')
    await pick(w)

    await saveButton(w)!.trigger('click')
    await flushPromises()
    router.replace('/t/t1/m/m1/h/16')
    await flushPromises()

    land(open)
    await flushPromises()

    expect(submitScore).toHaveBeenCalledWith('m1', expect.objectContaining({ hole_number: 15 }))
    expect(router.currentRoute.value.hash).toBe('#hole-15')
  })

  // A refusal belongs to the hole it happened on. Carried forward, one 409 switches the
  // redirect off for every hole after it and leaves the inert wheel behind.
  it('does not let one refusal keep the wheel open on every hole after it', async () => {
    // The stale tab: the match was live when this hole was opened and finished underneath.
    submitScore.mockRejectedValue(new ApiError(409, 'match is complete'))
    const w = await openAt('16')

    await pick(w)
    await saveButton(w)!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('closed to scoring')
    expect(router.currentRoute.value.name).toBe('hole') // the refusal stays readable

    // 17 is a hole the match never reached and cannot take, however it is arrived at.
    router.push('/t/t1/m/m1/h/17')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('match')
  })
})
