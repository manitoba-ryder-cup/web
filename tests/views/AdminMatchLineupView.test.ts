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
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      {
        match_id: 'm1',
        format_name: 'Singles',
        finished: false,
        winner_team_id: null,
        leader_team_id: null,
        lead: 0,
        holes_remaining: 18,
        tee_time: '2026-07-01T14:00:00Z',
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
    vi.mocked(scorecardApi.updateMatch).mockResolvedValue({
      id: 'm1',
      tournament_id: 't1',
      course_id: 'c1',
      tee_color_id: 'tc1',
      match_format_id: 'f1',
      tee_time: '2026-07-01T15:30:00Z',
      handicapped: false,
    })
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
  // The tee time is entered as the wall clock the tee sheet says, read at the course. The
  // stored instant 14:00Z is 09:00 at Elmhurst (CDT), so that is what the input must show —
  // not 14:00, and not whatever the admin's own zone makes of it.
  it('opens the editor on the course wall clock, not UTC', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()

    await w.find('button.underline').trigger('click')
    await flushPromises()

    expect((w.find('input[type="datetime-local"]').element as HTMLInputElement).value).toBe('2026-07-01T09:00')
  })

  it('sends the typed wall clock back as an instant at the course', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('button.underline').trigger('click')
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
    await w.find('button.underline').trigger('click')
    await flushPromises()
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(Object.keys(vi.mocked(scorecardApi.updateMatch).mock.calls[0][1])).toEqual(['tee_time'])
  })

  it('closes the editor and refetches once saved', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('button.underline').trigger('click')
    await flushPromises()
    expect(w.find('form').exists()).toBe(true)

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('form').exists()).toBe(false)
    // Once on mount, once after saving.
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(2)
  })

  it('leaves the tee time alone when the edit is cancelled', async () => {
    const w = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' }, global: { plugins: [router] } })
    await flushPromises()
    await w.find('button.underline').trigger('click')
    await flushPromises()

    await w
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    await flushPromises()

    expect(w.find('form').exists()).toBe(false)
    expect(scorecardApi.updateMatch).not.toHaveBeenCalled()
  })
})
