import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { scorecardApi } from '@/api/scorecard'

// The teams boundary: teams enter the app already ordered Blue-left/Red-right, so no
// component needs to sort them.
describe('scorecardApi.getTournamentTeams', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('returns teams Blue-first even when the server returns them Red-first', async () => {
    const serverTeams = [
      { id: 'a-red', color: 'Red', captain: null, points: 5 },
      { id: 'z-blue', color: 'Blue', captain: null, points: 5 },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(serverTeams), { status: 200 })))
    const teams = await scorecardApi.getTournamentTeams('t1')
    expect(teams.map((t) => t.color)).toEqual(['Blue', 'Red'])
  })
})
