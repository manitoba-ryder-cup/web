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
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError } from '@/api/types'
import AdminMatchLineupView from '@/views/admin/AdminMatchLineupView.vue'

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
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([])
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

  it('sends only the course and tee when the tee set moves', async () => {
    vi.mocked(scorecardApi.updateMatch).mockResolvedValue({} as never)
    const w = await mounted()
    await w.find('#tee').setValue('white')
    await detailsForm(w).trigger('submit')
    await flushPromises()

    expect(scorecardApi.updateMatch).toHaveBeenCalledWith('m1', { course_id: 'c1', tee_color_id: 'white' })
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
