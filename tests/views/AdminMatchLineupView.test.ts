import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentResults: vi.fn(),
    getTournamentTeams: vi.fn(),
    getTournamentPlayers: vi.fn(),
    listCourses: vi.fn(),
    updateMatch: vi.fn(),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AdminMatchLineupView from '@/views/admin/AdminMatchLineupView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/admin/:id', name: 'admin-tournament', component: { template: '<div/>' } }],
})

describe('AdminMatchLineupView', () => {
  beforeEach(() => {
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
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: null, points: 0 },
      { id: 'red-1', color: 'Red', captain: null, points: 0 },
    ])
    vi.mocked(scorecardApi.getTournamentPlayers).mockResolvedValue([])
    // Elmhurst is in Manitoba; the Minnesota course is here so a test can prove the tee
    // time is read at the course rather than anywhere else.
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([
      { id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' },
      { id: 'c2', name: 'Giants Ridge', time_zone: 'America/Chicago' },
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
    expect(w.text()).toContain('Singles')
  })

  // Read at the course: 14:00Z is 09:00 at Elmhurst, so that is what the input shows — not
  // 14:00, and not whatever the admin's own zone makes of it.
  it('shows the course wall clock, not UTC', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    expect((w.find('input[type="datetime-local"]').element as HTMLInputElement).value).toBe('2026-07-01T09:00')
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
    await w.find('form').trigger('submit')
    await flushPromises()

    // 10:30 at Elmhurst in July is CDT (UTC-5).
    expect(scorecardApi.updateMatch).toHaveBeenCalledWith('m1', { tee_time: '2026-07-01T15:30:00.000Z' })
  })

  // Only the tee time is sent, so the course, tee and format keep their stored values.
  it('sends nothing but the tee time', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('input[type="datetime-local"]').setValue('2026-07-01T10:30')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(Object.keys(vi.mocked(scorecardApi.updateMatch).mock.calls[0][1])).toEqual(['tee_time'])
  })

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
    await w.find('form').trigger('submit')
    await flushPromises()

    // Once on mount, once after saving.
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(2)
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })
})
