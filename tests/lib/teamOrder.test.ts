import { describe, it, expect } from 'vitest'
import { orderTeams, orderSides, teamColorRank } from '@/lib/teamOrder'
import type { MatchSide, TournamentTeam } from '@/api/types'

const team = (id: string, color: string): TournamentTeam => ({ id, color, captain: null, points: 0 })

describe('teamColorRank', () => {
  it('ranks Blue before Red, and anything else last', () => {
    expect(teamColorRank('Blue')).toBeLessThan(teamColorRank('Red'))
    expect(teamColorRank('Red')).toBeLessThan(teamColorRank('Green'))
    expect(teamColorRank(null)).toBe(teamColorRank('Green'))
  })
})

describe('orderTeams', () => {
  it('puts Blue first and Red second regardless of id order', () => {
    // The Red id sorts before the Blue id — an id sort would put Red first.
    const ordered = orderTeams([team('a-red', 'Red'), team('z-blue', 'Blue')])
    expect(ordered.map((t) => t.color)).toEqual(['Blue', 'Red'])
  })

  it('does not mutate its input', () => {
    const input = [team('a-red', 'Red'), team('z-blue', 'Blue')]
    orderTeams(input)
    expect(input.map((t) => t.color)).toEqual(['Red', 'Blue'])
  })
})

describe('orderSides', () => {
  const side = (teamId: string): MatchSide => ({ team_id: teamId, players: [] })

  it("orders a match's sides Blue-left/Red-right using the teams' colours", () => {
    const teams = [team('a-red', 'Red'), team('z-blue', 'Blue')]
    const sides = [side('a-red'), side('z-blue')]
    expect(orderSides(sides, teams).map((s) => s.team_id)).toEqual(['z-blue', 'a-red'])
  })
})
