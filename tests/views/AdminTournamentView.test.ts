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
    getCourseTees: vi.fn(),
    deleteMatch: vi.fn(),
    getTournamentTeams: vi.fn(),
    getMatchScores: vi.fn(),
    getMatchHoles: vi.fn(),
  },
}))

import { config } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { CardStub } from '../support/cardStub'
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
        players_per_side: 1,
        scores_per_player: true,
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
    vi.mocked(scorecardApi.listCourses).mockResolvedValue([
      { id: 'c1', name: 'Elmhurst', time_zone: 'America/Winnipeg' },
      { id: 'c2', name: 'Banff Springs', time_zone: 'America/Edmonton' },
    ])
    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([
      { course_id: 'c1', tee_color_id: 'gold', color: 'Gold', slope: 120, rating: 70 },
    ])
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

  const addButton = (w: ReturnType<typeof mount>) => w.findAll('button').find((b) => b.text().startsWith('+ Add'))
  // Neither select carries an id; the tee one is the only one offering tee colours.
  const teeSelect = (w: ReturnType<typeof mount>) =>
    w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.attributes('value') === 'gold'))

  // The ordinary setup flow: add a match, then add another. The course has not changed, so
  // nothing new arrives to derive a tee from — and Create is gated on having one.
  it('still has a tee selected when the form is reopened on the same course', async () => {
    const w = await mounted()
    await addButton(w)!.trigger('click')
    await flushPromises()
    const first = (teeSelect(w)!.element as HTMLSelectElement).value
    expect(first).not.toBe('')

    await w
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    await addButton(w)!.trigger('click')
    await flushPromises()

    expect((teeSelect(w)!.element as HTMLSelectElement).value).toBe(first)
  })

  // A claim about loaded data that an unloaded one satisfies just as well: the form opens
  // without waiting, so the tees are still in flight when it first renders.
  it('does not call a course empty while its tees are loading', async () => {
    let release!: () => void
    vi.mocked(scorecardApi.getCourseTees).mockImplementation(
      () =>
        new Promise(
          (resolve) => (release = () => resolve([{ course_id: 'c1', tee_color_id: 'gold', color: 'Gold', slope: 120, rating: 70 }])),
        ),
    )
    const w = await mounted()
    await addButton(w)!.trigger('click')
    await flushPromises()

    expect(w.text()).not.toContain('This course has no tee sets set up.')

    release()
    await flushPromises()
    expect(w.text()).not.toContain('This course has no tee sets set up.')
  })

  // useAsync reports an error only with nothing to show, so a 404 behind a cached copy is
  // swallowed and the card renders a match that is gone. Dropped, because there is no fetch.
  it('drops the deleted match from the cache', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 300_000 } } })
    config.global.plugins = [[VueQueryPlugin, { queryClient }]]
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([])
    vi.mocked(scorecardApi.getMatchScores).mockResolvedValue([])
    vi.mocked(scorecardApi.getMatchHoles).mockResolvedValue([])
    vi.mocked(scorecardApi.deleteMatch).mockResolvedValue(undefined)

    const visited = mount(CardStub)
    await flushPromises()
    visited.unmount()
    const cardKey = ['match', 't1', 'm1', true]
    expect(queryClient.getQueryData(cardKey)).toBeDefined()

    const wrapper = await mounted()
    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(queryClient.getQueryData(cardKey)).toBeUndefined()
  })

  it('deletes the match the button belongs to', async () => {
    vi.mocked(scorecardApi.deleteMatch).mockResolvedValue(undefined)
    const wrapper = await mounted()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(scorecardApi.deleteMatch).toHaveBeenCalledWith('m1')
  })

  // The other half of the drop above: a match the server would not delete is still there, and
  // throwing its copies away would send a reader to the server for a card it could already show.
  it('keeps the copies when the delete is refused', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 300_000 } } })
    config.global.plugins = [[VueQueryPlugin, { queryClient }]]
    vi.mocked(scorecardApi.getTournamentTeams).mockResolvedValue([])
    vi.mocked(scorecardApi.getMatchScores).mockResolvedValue([])
    vi.mocked(scorecardApi.getMatchHoles).mockResolvedValue([])
    vi.mocked(scorecardApi.deleteMatch).mockRejectedValue(new ApiError(409, 'That match has scores. Reset it before deleting it.'))

    const visited = mount(CardStub)
    await flushPromises()
    visited.unmount()
    const cardKey = ['match', 't1', 'm1', true]

    const wrapper = await mounted()
    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(queryClient.getQueryData(cardKey)).toBeDefined()
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

  // Nothing else here proves a course change issues a load at all, so the race test below can
  // pass without one ever happening.
  it("loads the new course's tees when the course changes", async () => {
    const w = await mounted()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Add'))!
      .trigger('click')
    await flushPromises()

    vi.mocked(scorecardApi.getCourseTees).mockResolvedValue([
      { course_id: 'c2', tee_color_id: 'banff-blue', color: 'Banff Blue', slope: 113, rating: 72 },
    ])
    const course = w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.text() === 'Banff Springs'))!
    await course.setValue('c2')
    await flushPromises()

    expect(scorecardApi.getCourseTees).toHaveBeenLastCalledWith('c2')
    const tee = w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.text() === 'Banff Blue'))
    expect(tee && (tee.element as HTMLSelectElement).value).toBe('banff-blue')
  })

  // A failed load is not an empty one: "no tee sets set up" is a claim about loaded data that
  // an errored load satisfies just as well, and Create is disabled with no way back.
  it('says a tee load failed rather than calling the course empty', async () => {
    const w = await mounted()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Add'))!
      .trigger('click')
    await flushPromises()

    vi.mocked(scorecardApi.getCourseTees).mockRejectedValue(new Error('offline'))
    const course = w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.text() === 'Banff Springs'))!
    await course.setValue('c2')
    await flushPromises()

    expect(w.text()).toContain("Couldn't load this course's tees")
    expect(w.text()).not.toContain('no tee sets set up')
    expect(w.findAll('button').some((b) => b.text() === 'Try again')).toBe(true)
  })

  // Switch course twice on a slow link and the first response can land last, leaving a course
  // and a tee from two different courses in a body the API refuses.
  it('ignores a tee response the course has already moved past', async () => {
    const elmhurst = [{ course_id: 'c1', tee_color_id: 'gold', color: 'Gold', slope: 120, rating: 70 }]
    const banff = [{ course_id: 'c2', tee_color_id: 'banff-blue', color: 'Banff Blue', slope: 113, rating: 72 }]
    const w = await mounted()
    // Opened before the deferring mock goes in, so this load is not one of the two below.
    await w
      .findAll('button')
      .find((b) => b.text().includes('Add'))!
      .trigger('click')
    await flushPromises()

    const deferred: ((tees: unknown) => void)[] = []
    vi.mocked(scorecardApi.getCourseTees).mockImplementation(
      () => new Promise((resolve) => deferred.push(resolve as (tees: unknown) => void)) as never,
    )
    const course = w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.text() === 'Banff Springs'))!
    await course.setValue('c2')
    await course.setValue('c1')
    // The current pick answers first and the one it replaced second, which is the interleaving
    // that leaves an earlier response landing last.
    deferred[1]?.(elmhurst)
    deferred[0]?.(banff)
    await flushPromises()

    const tee = w.findAll('select').find((sel) => sel.findAll('option').some((o) => o.text() === 'Gold'))
    expect((course.element as HTMLSelectElement).value).toBe('c1')
    expect(tee && (tee.element as HTMLSelectElement).value).toBe('gold')
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
