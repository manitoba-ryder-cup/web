import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'
import type { MatchResult, TournamentTeam } from '@/api/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/tournaments/:tournamentId/matches/:matchId', name: 'match', component: { template: '<div/>' } }],
})

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: null, points: 0 },
  { id: 't-red', color: 'Red', captain: null, points: 0 },
]

function match(o: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Fourball',
    finished: true,
    winner_team_id: 't-red',
    leader_team_id: 't-red',
    lead: 3,
    holes_remaining: 2,
    sides: [
      { team_id: 't-blue', players: [{ player_id: 'b1', first_name: 'Bo', last_name: 'Jones' }] },
      { team_id: 't-red', players: [{ player_id: 'r1', first_name: 'Amy', last_name: 'Smith' }] },
    ],
    hole_results: ['t-red', null, 't-blue'],
    tee_time: null,
    course_name: 'Test GC',
    ...o,
  }
}

const matches: MatchResult[] = [
  match({ match_id: 'm1', format_name: 'Fourball', winner_team_id: 't-red', lead: 3, holes_remaining: 2 }),
  match({ match_id: 'm2', format_name: 'Fourball', winner_team_id: 't-blue', lead: 2, holes_remaining: 0 }),
  match({ match_id: 'm3', format_name: 'Singles', finished: false, winner_team_id: null }),
]

describe('MatchResultsSection', () => {
  const mountIt = () => mount(MatchResultsSection, { props: { matches, teams, tournamentId: 't1' }, global: { plugins: [router] } })

  it('makes a tab per format in first-appearance order', () => {
    expect(
      mountIt()
        .findAll('button')
        .map((b) => b.text()),
    ).toEqual(['Fourball', 'Singles'])
  })

  it("renders each side's players on the active tab", () => {
    const t = mountIt().text()
    expect(t).toContain('Smith')
    expect(t).toContain('Jones')
  })

  it('shows the result and switches to the in-progress tab', async () => {
    const w = mountIt()
    expect(w.text()).toContain('&') // m1 → "3 & 2"
    expect(w.text()).toContain('UP') // m2 → "2 up"
    const singles = w.findAll('button').find((b) => b.text() === 'Singles')!
    await singles.trigger('click')
    expect(w.text()).toContain('In progress')
  })

  it("colours the result in the winning team's colour", () => {
    // m1's red team won → the result text carries the red team's colour class.
    expect(mountIt().html()).toContain('text-mrc-red-team')
  })

  it('shows placeholder names for a match with no players assigned', () => {
    // A seeded-but-unassigned slot has no sides; the card should still read as a pairing.
    const unassigned = match({
      match_id: 'm9',
      format_name: 'Fourball',
      finished: false,
      winner_team_id: null,
      sides: [],
      hole_results: [],
    })
    const w = mount(MatchResultsSection, {
      props: { matches: [unassigned], teams, tournamentId: 't1' },
      global: { plugins: [router] },
    })
    expect(w.text()).toContain('Player')
    expect(w.text()).toContain('One')
    expect(w.text()).toContain('Two') // Fourball → two a side
  })

  it('shows AS (not "In progress") and blue/red borders for an all-square unassigned match', () => {
    const unassigned = match({
      match_id: 'm9',
      format_name: 'Fourball',
      finished: false,
      winner_team_id: null,
      lead: 0,
      holes_remaining: 18,
      sides: [],
      hole_results: [],
    })
    const w = mount(MatchResultsSection, {
      props: { matches: [unassigned], teams, tournamentId: 't1' },
      global: { plugins: [router] },
    })
    expect(w.text()).toContain('AS')
    expect(w.text()).not.toContain('In progress')
    // Teams are known even before the draft: blue on the left, red on the right.
    expect(w.html()).toContain('border-mrc-blue-team')
    expect(w.html()).toContain('border-mrc-red-team')
  })
})
