import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    players_per_side: 2,
    scores_per_player: true,
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
    tee_time: '2026-09-18T13:00:00Z',
    scoring_opens_at: '2026-09-18T11:00:00Z',
    scoring_closes_at: '2026-09-19T01:00:00Z',
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
  const mountIt = (over: MatchResult[] = matches) =>
    mount(MatchResultsSection, { props: { matches: over, teams, tournamentId: 't1' }, global: { plugins: [router] } })
  const activeTab = (w: ReturnType<typeof mount>) =>
    w
      .findAll('button')
      .find((b) => b.classes().includes('text-mrc-accent'))
      ?.text()

  // The router is shared, and switching tabs writes the hash — which the next mount would read
  // as a choice somebody made, hiding what it opens on by default.
  beforeEach(async () => {
    // Mid-morning of the fixture's Friday: the 11:00 window is open, so these matches are
    // being played rather than merely scheduled.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-18T15:00:00Z'))
    await router.replace({ path: '/', hash: '' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  // What someone tapping Scores mid-round came for: the session out on the course, not
  // whichever format happened to tee off first.
  it('opens on the session still being played', () => {
    const w = mountIt()

    expect(activeTab(w)).toBe('Singles')
    // A live match reads as its running state ("3 UP"), never a placeholder word.
    expect(w.text()).toContain('3')
    expect(w.text()).toContain('UP')
    expect(w.text()).not.toContain('In progress')
  })

  // Three sessions, so the one to open on is not also the tab a missing `initial` falls back to
  // — otherwise this passes whether the just-played fallback works or not.
  it('stays on the session just played until the next tees off', () => {
    const w = mountIt([
      match({ match_id: 'm1', format_name: 'Fourball', finished: true, tee_time: '2026-09-18T11:00:00Z' }),
      match({ match_id: 'm2', format_name: 'Alt Shot', finished: true, tee_time: '2026-09-18T13:00:00Z' }),
      match({
        match_id: 'm3',
        format_name: 'Singles',
        finished: false,
        winner_team_id: null,
        sides: [],
        hole_results: [],
        tee_time: '2026-09-18T19:00:00Z',
      }),
    ])

    expect(activeTab(w)).toBe('Alt Shot')
  })

  // The match that decided the cup is the one people are looking at when it does.
  it('opens on the closing session once every match is done', () => {
    const w = mountIt(matches.map((m) => ({ ...m, finished: true, winner_team_id: m.winner_team_id ?? 't-red' })))

    expect(activeTab(w)).toBe('Singles')
  })

  it('shows a finished result on the tab it belongs to', async () => {
    const w = mountIt()

    await w
      .findAll('button')
      .find((b) => b.text() === 'Fourball')!
      .trigger('click')

    expect(w.text()).toContain('&') // m1 → "3 & 2"
  })

  it("colours a live match's status in the leader's colour", async () => {
    const w = mountIt()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Singles')!
      .trigger('click')
    // m3 is unfinished, but t-red leads it — the running status carries red, not grey.
    expect(w.html()).toContain('text-mrc-red-team')
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
      players_per_side: 2,
      scores_per_player: true,
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

  // The other side size, so the card is drawn from what the format says rather than from a
  // number that happens to suit the fourballs.
  it('draws one placeholder a side for a format that fields one', () => {
    const unassigned = match({
      match_id: 'm9',
      format_name: 'Singles',
      players_per_side: 1,
      scores_per_player: true,
      finished: false,
      winner_team_id: null,
      sides: [],
      hole_results: [],
    })
    const w = mount(MatchResultsSection, {
      props: { matches: [unassigned], teams, tournamentId: 't1' },
      global: { plugins: [router] },
    })

    expect(w.text()).toContain('One')
    expect(w.text()).not.toContain('Two')
  })

  it('shows AS (not "In progress") and blue/red borders for an all-square unassigned match', () => {
    const unassigned = match({
      match_id: 'm9',
      format_name: 'Fourball',
      players_per_side: 2,
      scores_per_player: true,
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
