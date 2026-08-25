import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const toasts: string[] = []
vi.mock('@/composables/useToast', () => ({
  toast: { success: (m: string) => toasts.push(m), error: (m: string) => toasts.push(m) },
}))

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournament: vi.fn(),
    getTournamentResults: vi.fn(),
    listMatchFormats: vi.fn(),
    listCourses: vi.fn(),
    deleteMatch: vi.fn(),
    createMatch: vi.fn(),
    getCourseTees: vi.fn(),
  },
}))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError } from '@/api/types'
import AdminTournamentView from '@/views/admin/AdminTournamentView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/admin/:id/players', name: 'admin-roster', component: { template: '<div/>' } },
    { path: '/admin/:id/teams', name: 'admin-teams', component: { template: '<div/>' } },
    { path: '/admin/:id/matches/:matchId', name: 'admin-lineup', component: { template: '<div/>' } },
  ],
})

describe('AdminTournamentView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toasts.length = 0
    vi.mocked(scorecardApi.getTournament).mockResolvedValue({
      id: 't1',
      name: 'Summer Cup',
      start_date: '2026-07-01',
      end_date: '2026-07-03',
      location: 'Winnipeg',
      phase: 'upcoming',
    })
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
        scoring_opens_at: new Date(new Date('2026-07-01T14:00:00Z').getTime() - 2 * 3600000).toISOString(),
        scoring_closes_at: new Date(new Date('2026-07-01T14:00:00Z').getTime() + 12 * 3600000).toISOString(),
        course_name: 'Elmhurst',
        sides: [],
        hole_results: [],
      },
    ])
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([
      { id: 'f1', name: 'Singles', players_per_side: 1, scores_per_player: true },
    ])
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([{ id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' }])
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([
      { course_id: 'c1', tee_color_id: 'blue', color: 'Blue', slope: 113, rating: 72 },
    ])
  })

  // A second day and a second format, which is what the sheet has to keep straight now that
  // there are no tabs doing it.
  function twoDays() {
    const at = (id: string, iso: string, format: string) => ({
      match_id: id,
      format_name: format,
      finished: false,
      winner_team_id: null,
      leader_team_id: null,
      lead: 0,
      holes_remaining: 18,
      tee_time: iso,
      scoring_opens_at: iso,
      scoring_closes_at: iso,
      course_name: 'Elmhurst',
      sides: [],
      hole_results: [],
    })
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([
      at('m3', '2026-07-02T14:00:00Z', 'Singles'),
      at('m1', '2026-07-01T14:00:00Z', 'Fourball'),
      at('m2', '2026-07-01T18:00:00Z', 'Alt Shot'),
    ])
  }

  // The whole route already requires tournaments:write, so the control needs no gate of its own.
  async function mounted() {
    const wrapper = mount(AdminTournamentView, {
      props: { id: 't1' },
      global: { plugins: [router] },
    })
    await flushPromises()
    return wrapper
  }

  function deleteButton(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('button').find((b) => b.attributes('aria-label')?.startsWith('Delete the'))
  }

  // Every match on one sheet in tee-time order. Tabs put each format behind a click and hid
  // the rest, which stopped making sense once a match could change format from the page below.
  it('lists every match in tee-time order regardless of format', async () => {
    twoDays()
    const w = await mounted()

    const rows = w.findAll('a[href*="/matches/"]').map((a) => a.text().replace(/\s+/g, ' '))
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('Fourball')
    expect(rows[1]).toContain('Alt Shot')
    expect(rows[2]).toContain('Singles')
  })

  // The time on a row carries no date, and both days of a cup tee off in the morning.
  it('separates the days', async () => {
    twoDays()
    const w = await mounted()

    expect(w.text()).toContain('Wed, Jul 1')
    expect(w.text()).toContain('Thu, Jul 2')
  })

  // The tabs were built from the formats of existing matches, so a cup with none had no tab,
  // and the add control lived inside one. There was no way to create the first match here.
  it('offers the form when there are no matches at all', async () => {
    vi.mocked(scorecardApi.getTournamentResults).mockResolvedValue([])
    const w = await mounted()

    const add = w.findAll('button').find((b) => b.text().includes('Add match'))
    expect(add).toBeDefined()
  })

  it('creates the match with the format picked in the form', async () => {
    twoDays()
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([
      { id: 'f1', name: 'Singles', players_per_side: 1, scores_per_player: true },
      { id: 'f2', name: 'Fourball', players_per_side: 2, scores_per_player: true },
    ])
    const w = await mounted()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Add match'))!
      .trigger('click')
    await flushPromises()
    await w.find('select').setValue('f2')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Create match')!
      .trigger('click')
    await flushPromises()

    expect(scorecardApi.createMatch).toHaveBeenCalledWith('t1', expect.objectContaining({ match_format_id: 'f2' }))
  })

  it('deletes the match the button belongs to', async () => {
    vi.mocked(scorecardApi.deleteMatch).mockResolvedValue(undefined)
    const wrapper = await mounted()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(scorecardApi.deleteMatch).toHaveBeenCalledWith('m1')
  })

  // A refused delete has something to say and must not read as one that worked. The sentence
  // is the server's, so a copy here would go on saying the old one after the server moved on.
  it('shows the refusal the server sent', async () => {
    vi.mocked(scorecardApi.deleteMatch).mockRejectedValue(new ApiError(409, 'That match has scores. Reset it before deleting it.'))
    const wrapper = await mounted()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(toasts.at(-1)).toBe('That match has scores. Reset it before deleting it.')
    expect(toasts).not.toContain('Match deleted')
  })

  // The row is a link and a button side by side, since one cannot nest in the other.
  it('keeps the row navigable alongside the delete', async () => {
    const wrapper = await mounted()
    const link = wrapper.findAll('a').find((a) => a.attributes('href')?.includes('/matches/m1'))
    expect(link).toBeTruthy()
    expect(link!.findAll('button')).toHaveLength(0)
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(AdminTournamentView, { props: { id: 't1' }, global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No matches have been created for this tournament yet.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Singles')
  })
})
