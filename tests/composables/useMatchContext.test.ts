import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { MatchResult } from '@/api/types'

// Blue is listed second here: the composable is expected to order the sides, not echo
// whatever the server sent.
const match: MatchResult = {
  match_id: 'm1',
  format_name: 'Singles',
  finished: false,
  winner_team_id: null,
  leader_team_id: null,
  lead: 0,
  holes_remaining: 18,
  sides: [
    { team_id: 'red', players: [{ player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' }] },
    { team_id: 'blue', players: [{ player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' }] },
  ],
  hole_results: [],
  tee_time: '2026-09-18T13:00:00Z',
  scoring_opens_at: new Date(new Date('2026-09-18T13:00:00Z').getTime() - 2 * 3600000).toISOString(),
  scoring_closes_at: new Date(new Date('2026-09-18T13:00:00Z').getTime() + 12 * 3600000).toISOString(),
  course_name: 'Clear Lake',
}
const teams = [
  { id: 'blue', color: 'Blue', captain: null, points: 0 },
  { id: 'red', color: 'Red', captain: null, points: 0 },
]
const holes = [{ number: 1, par: 4, hdcp: 1, yards: 400 }]
const holeStates = [{ hole_number: 1, team_scores: [], leader_team_id: null, lead: 0, holes_remaining: 17, decided: false }]

const getMatchHoles = vi.fn()
vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getTournamentTeams: vi.fn(() => Promise.resolve(teams)),
    getTournamentResults: vi.fn(() => Promise.resolve([match, { ...match, match_id: 'other' }])),
    getMatchScores: vi.fn(() => Promise.resolve(holeStates)),
    getMatchHoles: (...args: unknown[]) => getMatchHoles(...args),
  },
}))

import { useMatchContext } from '@/composables/useMatchContext'

function harness(matchId = 'm1', options?: Parameters<typeof useMatchContext>[2]) {
  return defineComponent({
    setup: () => useMatchContext('t1', matchId, options),
    template: '<div/>',
  })
}

describe('useMatchContext', () => {
  beforeEach(() => {
    getMatchHoles.mockReset().mockResolvedValue(holes)
  })

  it('picks the match out of the tournament results and orders its sides', async () => {
    const w = mount(harness())
    await flushPromises()

    expect(w.vm.match?.match_id).toBe('m1')
    expect(w.vm.left?.team_id).toBe('blue')
    expect(w.vm.right?.team_id).toBe('red')
    expect(w.vm.holes).toEqual(holes)
    expect(w.vm.holeStates).toEqual(holeStates)
    expect(w.vm.error).toBe('')
  })

  it('surfaces a missing tee set as an error by default', async () => {
    // The entry page cannot lay out a wheel without par, so it must not load half-blind.
    getMatchHoles.mockRejectedValue(new Error('no tee set'))

    const w = mount(harness())
    await flushPromises()

    expect(w.vm.error).toBe('no tee set')
  })

  it('treats a missing tee set as empty when par is optional', async () => {
    getMatchHoles.mockRejectedValue(new Error('no tee set'))

    const w = mount(harness('m1', { parOptional: true }))
    await flushPromises()

    expect(w.vm.error).toBe('')
    expect(w.vm.holes).toEqual([])
    expect(w.vm.match?.match_id).toBe('m1')
  })

  it('has no match when the id is not in the results', async () => {
    const w = mount(harness('missing'))
    await flushPromises()

    expect(w.vm.match).toBe(null)
    expect(w.vm.left).toBe(null)
  })
})
