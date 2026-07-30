import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { formatWallClock } from '@/lib/teeTime'

const match = {
  match_id: 'm1',
  format_name: 'Singles',
  course_name: 'Pine Ridge',
  tee_time: '2026-09-18T13:00:00Z',
  tee_time_local: '2026-09-18T08:00',
  finished: false,
  winner_team_id: null,
  leader_team_id: null,
  lead: 0,
  holes_remaining: 18,
  hole_results: [],
  sides: [
    { team_id: 'blue-1', players: [{ player_id: 'b1', first_name: 'Bo', last_name: 'Jones' }] },
    { team_id: 'red-1', players: [{ player_id: 'r1', first_name: 'Cara', last_name: 'Lee' }] },
  ],
}

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    // Deferred, not `.mockResolvedValue([match])`: vi.mock factories are hoisted above the
    // `const match` below, so an eager reference to `match` here trips Vitest's
    // "Cannot access before initialization" — wrapping it defers the read to call time.
    getTournamentResults: vi.fn(() => Promise.resolve([match])),
    getTournamentTeams: vi.fn().mockResolvedValue([
      { id: 'blue-1', color: 'Blue', captain: { id: 'p1', first_name: 'Bo', last_name: 'Jones' }, points: 0 },
      { id: 'red-1', color: 'Red', captain: { id: 'p2', first_name: 'Cara', last_name: 'Lee' }, points: 0 },
    ]),
    getTournamentPlayers: vi.fn().mockResolvedValue([
      { player_id: 'b1', team_id: 'blue-1', first_name: 'Bo', last_name: 'Jones', tier: 'gold' },
      { player_id: 'r1', team_id: 'red-1', first_name: 'Cara', last_name: 'Lee', tier: 'blue' },
    ]),
    addParticipant: vi.fn().mockResolvedValue(undefined),
    removeParticipant: vi.fn().mockResolvedValue(undefined),
    updateMatchTeeTime: vi.fn().mockResolvedValue(undefined),
  },
}))

import { scorecardApi } from '@/api/scorecard'
import AdminMatchLineupView from '@/views/admin/AdminMatchLineupView.vue'

const mountView = async () => {
  const wrapper = mount(AdminMatchLineupView, { props: { id: 't1', matchId: 'm1' } })
  await flushPromises()
  return wrapper
}

describe('AdminMatchLineupView tee time', () => {
  beforeEach(() => vi.clearAllMocks())

  // The course's clock, not the viewer's: the test runner's zone is irrelevant to the
  // number shown, which is the whole point of the rule. Expected value is computed via
  // formatWallClock itself (unit-tested separately in tests/lib/teeTime.test.ts) rather
  // than a hardcoded "8:00 AM", because the AM/PM spelling follows the runner's default
  // ICU locale (e.g. "8:00 a.m." under en-CA) — hardcoding it made this test pass or fail
  // by machine rather than by whether the view reads tee_time_local unconverted.
  it('shows the tee time in the course’s clock', async () => {
    const wrapper = await mountView()
    expect(wrapper.text()).toContain(formatWallClock(match.tee_time_local))
  })

  it('prefills the field with the course wall clock', async () => {
    const wrapper = await mountView()
    await wrapper.get('[data-test="edit-tee-time"]').trigger('click')

    const input = wrapper.get<HTMLInputElement>('[data-test="tee-time-input"]')
    expect(input.element.value).toBe('2026-09-18T08:00')
  })

  it('sends exactly what was typed, with no conversion', async () => {
    const wrapper = await mountView()
    await wrapper.get('[data-test="edit-tee-time"]').trigger('click')
    await wrapper.get('[data-test="tee-time-input"]').setValue('2026-09-18T08:20')
    await wrapper.get('[data-test="save-tee-time"]').trigger('click')
    await flushPromises()

    expect(scorecardApi.updateMatchTeeTime).toHaveBeenCalledWith('m1', '2026-09-18T08:20')
  })

  it('refetches so the header shows the new time', async () => {
    const wrapper = await mountView()
    await wrapper.get('[data-test="edit-tee-time"]').trigger('click')
    await wrapper.get('[data-test="save-tee-time"]').trigger('click')
    await flushPromises()

    // Once on mount, once after the write.
    expect(scorecardApi.getTournamentResults).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="tee-time-input"]').exists()).toBe(false)
  })

  // A dropped request on a phone in a field must leave the typed value in place to retry,
  // not close the form and swallow it.
  it('keeps the form open and explains a failure', async () => {
    vi.mocked(scorecardApi.updateMatchTeeTime).mockRejectedValueOnce(new Error('network'))
    const wrapper = await mountView()
    await wrapper.get('[data-test="edit-tee-time"]').trigger('click')
    await wrapper.get('[data-test="tee-time-input"]').setValue('2026-09-18T08:20')
    await wrapper.get('[data-test="save-tee-time"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not update the tee time')
    const input = wrapper.get<HTMLInputElement>('[data-test="tee-time-input"]')
    expect(input.element.value).toBe('2026-09-18T08:20')
  })

  it('cancels without writing', async () => {
    const wrapper = await mountView()
    await wrapper.get('[data-test="edit-tee-time"]').trigger('click')
    await wrapper.get('[data-test="cancel-tee-time"]').trigger('click')

    expect(wrapper.find('[data-test="tee-time-input"]').exists()).toBe(false)
    expect(scorecardApi.updateMatchTeeTime).not.toHaveBeenCalled()
  })
})
