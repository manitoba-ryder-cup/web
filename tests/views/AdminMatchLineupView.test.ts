import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const toasts: string[] = []
vi.mock('@/composables/useToast', () => ({
  toast: { success: (m: string) => toasts.push(m), error: (m: string) => toasts.push(m) },
}))

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentResults: vi.fn(),
    getTournamentTeams: vi.fn(),
    getTournamentPlayers: vi.fn(),
    listCourses: vi.fn(),
    listMatches: vi.fn(),
    listMatchFormats: vi.fn(),
    getCourseTees: vi.fn(),
    updateMatch: vi.fn(),
    setLineup: vi.fn(),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError } from '@/api/types'
import AdminMatchLineupView from '@/views/admin/AdminMatchLineupView.vue'
import { utcToEventInput } from '@/lib/teeTime'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/admin/:id', name: 'admin-tournament', component: { template: '<div/>' } }],
})

describe('AdminMatchLineupView', () => {
  beforeEach(() => {
    toasts.length = 0
    vi.clearAllMocks()
    // A refetch after saving has to return what was saved, or the view looks permanently unsaved
    // and the test asserts against a server that never persists.
    let storedTeeTime = '2026-07-01T14:00:00Z'
    vi.mocked(scorecardApi.updateMatch).mockImplementation(async (_id, body) => {
      if (body.tee_time) storedTeeTime = body.tee_time
      return {
        id: 'm1',
        tournament_id: 't1',
        course_id: 'c1',
        tee_color_id: 'tc1',
        match_format_id: 'f1',
        tee_time: storedTeeTime,
        handicapped: false,
      }
    })
    vi.mocked(scorecardApi.getTournamentResults).mockImplementation(async () => [
      {
        match_id: 'm1',
        format_name: 'Singles',
        finished: false,
        winner_team_id: null,
        leader_team_id: null,
        lead: 0,
        holes_remaining: 18,
        tee_time: storedTeeTime,
        scoring_opens_at: new Date(new Date(storedTeeTime).getTime() - 2 * 3600000).toISOString(),
        scoring_closes_at: new Date(new Date(storedTeeTime).getTime() + 12 * 3600000).toISOString(),
        course_name: 'Elmhurst',
        sides: [],
        hole_results: [],
      },
    ])
    // Singles takes one a side and Fourball two, which is what the lineup is measured against.
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([
      { id: 'f1', name: 'Singles', players_per_side: 1, scores_per_player: true },
      { id: 'f2', name: 'Fourball', players_per_side: 2, scores_per_player: true },
    ])
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
    // Two drafted players a side, so there is somebody to name and somebody left over.
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([
      { player_id: 'red-a', team_id: 'red-1', first_name: 'Red', last_name: 'Alpha', tier: 'gold' },
      { player_id: 'red-b', team_id: 'red-1', first_name: 'Red', last_name: 'Bravo', tier: 'blue' },
      { player_id: 'blue-a', team_id: 'blue-1', first_name: 'Blue', last_name: 'Alpha', tier: 'gold' },
    ] as never)
    // Banff is an hour behind Elmhurst, which is what lets a test tell the course's clock
    // from the fallback. Chicago, the previous second course, shares Winnipeg's offset.
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([
      { id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' },
      { id: 'c2', name: 'Banff Springs', time_zone: 'America/Edmonton' },
    ])
    // The result carries a course name and no ids, so the pickers are set from the record.
    vi.mocked(scorecardApi.listMatches).mockResolvedValue([
      {
        id: 'm1',
        tournament_id: 't1',
        course_id: 'c1',
        tee_color_id: 'gold',
        match_format_id: 'f1',
        tee_time: '2026-09-18T13:00:00Z',
        handicapped: false,
      },
    ])
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([
      { course_id: 'c1', tee_color_id: 'white', color: 'White', slope: 113, rating: 72 },
      { course_id: 'c1', tee_color_id: 'gold', color: 'Gold', slope: 120, rating: 70 },
    ])
  })

  it('shows a skeleton while loading, not "Match not found."', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })

    // The view resolves the match by scanning a list that is empty until the fetch lands,
    // so its not-found branch is the default state rather than a real conclusion.
    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Match not found.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    // The form itself, not a course or format name: both are listed in pickers whatever this
    // match turned out to be.
    expect(w.find('#course').exists()).toBe(true)
  })

  // Read at the course: 14:00Z is 09:00 at Elmhurst, so that is what the input shows — not
  // 14:00, and not whatever the admin's own zone makes of it.
  it('shows the course wall clock, not UTC', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    expect((w.find('input[type="datetime-local"]').element as HTMLInputElement).value).toBe('2026-07-01T09:00')
  })

  // 14:00Z is 09:00 in Manitoba and 08:00 in Alberta. The fallback zone is Manitoba's, so a
  // match somewhere else is the only thing that tells the course's clock from the default.
  it("reads the tee time at the match's own course", async () => {
    vi.mocked(scorecardApi.listMatches).mockResolvedValue([
      {
        id: 'm1',
        tournament_id: 't1',
        course_id: 'c2',
        tee_color_id: 'gold',
        match_format_id: 'f1',
        tee_time: '2026-07-01T14:00:00Z',
        handicapped: false,
      },
    ])
    const w = await mounted()

    expect((w.find('input[type="datetime-local"]').element as HTMLInputElement).value).toBe('2026-07-01T08:00')
  })

  // The match arrives after mount, so the input has to fill in when it lands rather than
  // being initialised once from nothing.
  it('fills the input once the match loads', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    expect(w.find('input[type="datetime-local"]').exists()).toBe(false)

    await flushPromises()
    expect((w.find('input[type="datetime-local"]').element as HTMLInputElement).value).toBe('2026-07-01T09:00')
  })

  it('sends the typed wall clock back as an instant at the course', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    // 10:30 at Elmhurst in July is CDT (UTC-5).
    expect(scorecardApi.updateMatch).toHaveBeenCalledWith('m1', { tee_time: '2026-07-01T15:30:00.000Z' })
  })

  // Only the tee time is sent, so the course, tee and format keep their stored values.
  it('sends nothing but the tee time', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(Object.keys(vi.mocked(scorecardApi.updateMatch).mock.calls[0][1])).toEqual(['tee_time'])
  })

  async function mounted() {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    return w
  }

  it('sets the pickers from the match record, not the course name', async () => {
    const w = await mounted()
    expect((w.find('#course').element as HTMLSelectElement).value).toBe('c1')
    // Gold is second in the list, so falling back to the first would look different.
    expect((w.find('#tee').element as HTMLSelectElement).value).toBe('gold')
  })

  // The tee time rides along with the tee set, because a course change moves the zone the clock
  // is read in and the field would otherwise disagree with what the page shows a moment later.
  it('sends the tee time with the tee set, and nothing else', async () => {
    vi.mocked(scorecardApi.updateMatch).mockResolvedValue({} as never)
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    // Same course, so the instant is unchanged — the stored 14:00Z, sent back as it stands.
    expect(scorecardApi.updateMatch).toHaveBeenCalledWith('m1', {
      course_id: 'c1',
      tee_color_id: 'white',
      tee_time: '2026-07-01T14:00:00.000Z',
    })
  })

  // A course in another zone keeps the wall clock the tee sheet says, so the instant moves.
  // Reading it back at the new course then shows what the field showed when Save was pressed.
  it('keeps the clock when the course moves to another zone', async () => {
    vi.mocked(scorecardApi.updateMatch).mockResolvedValue({} as never)
    const w = await mounted()
    const shown = (w.find('input[type="datetime-local"]').element as HTMLInputElement).value

    await w.find('#course').setValue('c2')
    await flushPromises()
    await detailsForm(w).trigger('submit')
    await flushPromises()

    const sent = vi.mocked(scorecardApi.updateMatch).mock.calls.at(-1)![1].tee_time!
    expect(utcToEventInput(sent, 'America/Edmonton')).toBe(shown)
  })

  // Changing the course reloads its tees, since a colour is a tee set on one course and
  // means nothing on another.
  it('reloads the tees when the course changes', async () => {
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([
      { course_id: 'c2', tee_color_id: 'blue', color: 'Blue', slope: 118, rating: 71 },
    ])
    const w = await mounted()
    await w.find('#course').setValue('c2')
    await flushPromises()

    expect(scorecardApi.getCourseTees).toHaveBeenLastCalledWith('c2')
    expect((w.find('#tee').element as HTMLSelectElement).value).toBe('blue')
  })

  // Three refusals reach this one route and only the server knows which, so a copy of any one
  // of them here is the wrong sentence for the other two.
  it('shows the refusal the server sent, not a copy of one of them', async () => {
    vi.mocked(scorecardApi.updateMatch).mockRejectedValue(new ApiError(409, 'That would be too many players a side for this format.'))
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(toasts.at(-1)).toBe('That would be too many players a side for this format.')
  })

  it('has nothing to save until the tee set actually moves', async () => {
    const w = await mounted()
    expect(saveButton(w).attributes('disabled')).toBeDefined()
    await w.find('#tee').setValue('white')
    expect(saveButton(w).attributes('disabled')).toBeUndefined()
  })

  it('sends both when both move', async () => {
    vi.mocked(scorecardApi.updateMatch).mockResolvedValue({} as never)
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(Object.keys(vi.mocked(scorecardApi.updateMatch).mock.calls[0][1]).sort()).toEqual(['course_id', 'tee_color_id', 'tee_time'])
  })

  // How many a side is the format's to say. Read off the name, every format but Singles was
  // taken to hold two, which was true only until one of them did not.
  it('counts the slots a side from the format rather than its name', async () => {
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([
      { id: 'f1', name: 'Singles', players_per_side: 3, scores_per_player: true },
    ])
    const w = await mounted()

    expect(w.text()).toContain('0/3')
  })

  const playerPill = (w: ReturnType<typeof mount>, name: string) => w.findAll('button').find((b) => b.text().includes(name))

  // Naming a player is an edit to the page, not a request. The whole lineup goes at once, so
  // there is nothing to send until Save is pressed.
  it('stages a player rather than writing them', async () => {
    const w = await mounted()
    await playerPill(w, 'Red Alpha')!.trigger('click')
    await playerPill(w, 'Blue Alpha')!.trigger('click')

    expect(scorecardApi.setLineup).not.toHaveBeenCalled()
    expect(saveButton(w).attributes('disabled')).toBeUndefined()
  })

  // The API takes a lineup whole and refuses one that is short, and this page holds both
  // numbers, so it says so rather than spending a request to be told.
  it('will not save a lineup with a side still to name', async () => {
    const w = await mounted()
    await playerPill(w, 'Red Alpha')!.trigger('click')

    expect(w.text()).toContain('Each side needs 1 player')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('sends the whole lineup on save', async () => {
    const w = await mounted()
    await playerPill(w, 'Red Alpha')!.trigger('click')
    await playerPill(w, 'Blue Alpha')!.trigger('click')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(scorecardApi.setLineup).toHaveBeenCalledWith('m1', [
      { player_id: 'red-a', team_id: 'red-1' },
      { player_id: 'blue-a', team_id: 'blue-1' },
    ])
  })

  // Fourball, so the side still has room and the choices stay on screen. Under singles the
  // block is hidden once a side is full, which would pass whatever the filter did.
  it('takes a named player out of the choices while the side has room', async () => {
    vi.mocked(scorecardApi.listMatches).mockResolvedValue([
      {
        id: 'm1',
        tournament_id: 't1',
        course_id: 'c1',
        tee_color_id: 'gold',
        match_format_id: 'f2',
        tee_time: '2026-09-18T13:00:00Z',
        handicapped: false,
      },
    ])
    const w = await mounted()
    expect(w.text()).toContain('0/2')

    await playerPill(w, 'Red Alpha')!.trigger('click')

    expect(w.text()).toContain('1/2')
    expect(playerPill(w, 'Red Alpha')).toBeUndefined()
    expect(playerPill(w, 'Red Bravo')).toBeDefined()
  })

  it('has nothing to save until the lineup actually changes', async () => {
    const w = await mounted()
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  // The setup list carries the tee time and the pairing, so it shows the change in the context
  // it was made for. Getting there is also where the next match is.
  it('returns to the setup list once the save lands', async () => {
    await router.push('/')
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin-tournament')
    expect(router.currentRoute.value.params.id).toBe('t1')
  })

  // A refusal is the half that did not save, and the list has nothing to say about it.
  it('stays put when the server refuses', async () => {
    vi.mocked(scorecardApi.updateMatch).mockRejectedValue(new ApiError(409, 'That match has scores.'))
    await router.push('/')
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).not.toBe('admin-tournament')
  })

  // eslint-disable-next-line comment-cap/max-lines -- the tee time is load-bearing setup here,
  // and a reader who removes it turns this into a test that cannot fail
  // The tee time moves too, so the refetch brings back something the query cache cannot share
  // structurally. That is what makes the re-seed reachable: the details half saved, the lineup
  // half was refused, and the draft used to be erased by the refetch that followed.
  it('keeps the draft lineup when the save is refused', async () => {
    vi.mocked(scorecardApi.setLineup).mockRejectedValue(new ApiError(409, "That lineup isn't the right size."))
    const w = await mounted()
    await playerPill(w, 'Red Alpha')!.trigger('click')
    await playerPill(w, 'Blue Alpha')!.trigger('click')
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T11:45')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(toasts.at(-1)).toBe("That lineup isn't the right size.")
    // The counters read the draft, and a name in the text alone would also match the pill the
    // player goes back to being when the draft is lost.
    expect(w.text()).toContain('1/1')
    expect(w.text()).not.toContain('0/1')
  })

  // The wall clock is typed off the new course's tee sheet, so it converts at that course.
  // Banff is an hour behind Elmhurst, which is what makes the two answers distinguishable.
  it('reads a moved tee time at the course it is moving to', async () => {
    const w = await mounted()
    await w.find('#course').setValue('c2')
    await flushPromises()
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    // 10:30 at Banff in July is MDT (UTC-6); at Elmhurst it would have been 15:30Z.
    expect(scorecardApi.updateMatch).toHaveBeenCalledWith('m1', expect.objectContaining({ tee_time: '2026-07-01T16:30:00.000Z' }))
  })

  // A 400 for a player another admin undrafted is permanent, so "please try again" invites a
  // retry that can never work.
  it('shows what the server said for any refusal, not only a conflict', async () => {
    vi.mocked(scorecardApi.updateMatch).mockRejectedValue(new ApiError(400, "That request wasn't valid."))
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(toasts.at(-1)).toBe("That request wasn't valid.")
  })

  // The one place on this page with something to re-run and, until now, nothing offered: an
  // empty Tees select reads exactly like a course that has no tee sets.
  it('offers a retry when the tees cannot be loaded', async () => {
    vi.mocked(scorecardApi.getCourseTees).mockRejectedValue(new Error('offline'))
    const w = await mounted()

    expect(w.text()).toContain("Couldn't load this course's tees")
    expect(w.findAll('button').some((b) => b.text() === 'Try again')).toBe(true)
  })

  // A course whose tees will not load kept the previous course's tee id armed, so Save offered
  // to write a pair from two different courses — which the API refuses.
  it("does not keep the old course's tee when the new one's cannot be loaded", async () => {
    const w = await mounted()
    expect((w.find('#tee').element as HTMLSelectElement).value).toBe('gold')

    vi.mocked(scorecardApi.getCourseTees).mockRejectedValue(new Error('offline'))
    await w.find('#course').setValue('c2')
    await flushPromises()

    expect(w.text()).toContain("Couldn't load this course's tees")
    // Nothing to save: a course with no tee is not a tee set the API would take.
    const save = w.findAll('button').find((b) => b.text() === 'Save')
    expect(save?.attributes('disabled')).toBeDefined()
  })

  // Switching course twice quickly can land the first response last, leaving the course reading
  // one thing and the tees another — a pair the server rejects as a 400 with nothing useful.
  it('ignores a tee response the course has already moved past', async () => {
    const deferred: ((tees: unknown) => void)[] = []
    vi.mocked(scorecardApi.getCourseTees).mockImplementation(
      () => new Promise((resolve) => deferred.push(resolve as (tees: unknown) => void)) as never,
    )
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    const gold = [{ course_id: 'c1', tee_color_id: 'gold', color: 'Gold', slope: 120, rating: 70 }]
    const banff = [{ course_id: 'c2', tee_color_id: 'banff-blue', color: 'Banff Blue', slope: 113, rating: 72 }]
    deferred[0]?.(gold) // the load the page made on mount
    await flushPromises()

    await w.find('#course').setValue('c2')
    await w.find('#course').setValue('c1')
    // Answer the current pick first and the one it replaced second, which is the interleaving
    // that leaves an earlier response landing last.
    deferred[2]?.(gold)
    deferred[1]?.(banff)
    await flushPromises()

    expect((w.find('#course').element as HTMLSelectElement).value).toBe('c1')
    expect((w.find('#tee').element as HTMLSelectElement).value).toBe('gold')
  })

  // A retry re-issues the request that failed. Bare, it falls through to the first tee in the
  // list — which after a failed initial load arms a tee set change on the match's own course.
  it('retries the tee load without arming a change nobody made', async () => {
    vi.mocked(scorecardApi.getCourseTees).mockRejectedValueOnce(new Error('offline'))
    const w = await mounted()
    expect(w.text()).toContain("Couldn't load this course's tees")

    await w
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click')
    await flushPromises()

    // gold is the match's stored tee and second in the list, so the first-tee fallback shows.
    expect((w.find('#tee').element as HTMLSelectElement).value).toBe('gold')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  const detailsForm = (w: ReturnType<typeof mount>) => w.find('form')
  const saveButton = (w: ReturnType<typeof mount>) => w.findAll('button').find((b) => b.text() === 'Save')!

  // Nothing to save until something changes — and with the input always on screen, that is
  // the only thing distinguishing "looking at it" from "moving it".
  it('enables Save only once the time changes', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(saveButton(w).attributes('disabled')).toBeDefined()

    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    expect(saveButton(w).attributes('disabled')).toBeUndefined()
  })

  it('refetches and settles back to unchanged after saving', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    // Once on mount, once after saving.
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(2)
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })
})
