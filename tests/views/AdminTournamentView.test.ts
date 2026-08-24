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
    vi.mocked(scorecardApi.listMatchFormats).mockResolvedValue([{ id: 'f1', name: 'Singles' }])
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([{ id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' }])
  })

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

  it('deletes the match the button belongs to', async () => {
    vi.mocked(scorecardApi.deleteMatch).mockResolvedValue(undefined)
    const wrapper = await mounted()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(scorecardApi.deleteMatch).toHaveBeenCalledWith('m1')
  })

  // A refused delete is the one failure with something useful to say, and it must not read
  // as a delete that worked.
  it('tells a scorer to reset a match before deleting it', async () => {
    vi.mocked(scorecardApi.deleteMatch).mockRejectedValue(new ApiError(409, 'match has been scored'))
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
