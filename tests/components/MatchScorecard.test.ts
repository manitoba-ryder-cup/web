import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'
import type { Hole, HoleStatus, MatchPlayer, TournamentTeam } from '@/api/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/t/:tournamentId/m/:matchId/h/:hole', name: 'hole', component: { template: '<div/>' } }],
})

const leftTeam: TournamentTeam = { id: 'blue', color: 'Blue', captain: null, points: 0 }
const rightTeam: TournamentTeam = { id: 'red', color: 'Red', captain: null, points: 0 }
const leftPlayers: MatchPlayer[] = [
  { player_id: 'p1', first_name: 'Justin', last_name: 'Rabe' },
  { player_id: 'p3', first_name: 'Keith', last_name: 'Van Walleghem' },
]
const rightPlayers: MatchPlayer[] = [
  { player_id: 'p2', first_name: 'Harbs', last_name: 'Benning' },
  { player_id: 'p4', first_name: 'Connor', last_name: 'Macaulay' },
]
const holeInfo = new Map<number, Hole>([
  [1, { number: 1, par: 4, hdcp: 1, yards: 300 }],
  [2, { number: 2, par: 4, hdcp: 2, yards: 310 }],
  [3, { number: 3, par: 4, hdcp: 3, yards: 320 }],
])
// Hole 1 blue takes with a 4; hole 2 both blue make 4 and red halves it; hole 3 blue wins
// with both on 3.
const holeStates: HoleStatus[] = [
  {
    hole_number: 1,
    team_scores: [
      {
        team_id: 'blue',
        strokes: 4,
        player_scores: [
          { player_id: 'p1', strokes: 5 },
          { player_id: 'p3', strokes: 4 },
        ],
      },
      {
        team_id: 'red',
        strokes: 5,
        player_scores: [
          { player_id: 'p2', strokes: 5 },
          { player_id: 'p4', strokes: 6 },
        ],
      },
    ],
    leader_team_id: 'blue',
    lead: 1,
    holes_remaining: 17,
    decided: false,
  },
  {
    hole_number: 2,
    team_scores: [
      {
        team_id: 'blue',
        strokes: 4,
        player_scores: [
          { player_id: 'p1', strokes: 4 },
          { player_id: 'p3', strokes: 4 },
        ],
      },
      {
        team_id: 'red',
        strokes: 4,
        player_scores: [
          { player_id: 'p2', strokes: 4 },
          { player_id: 'p4', strokes: 5 },
        ],
      },
    ],
    leader_team_id: 'blue',
    lead: 1,
    holes_remaining: 16,
    decided: false,
  },
  {
    hole_number: 3,
    team_scores: [
      {
        team_id: 'blue',
        strokes: 3,
        player_scores: [
          { player_id: 'p1', strokes: 3 },
          { player_id: 'p3', strokes: 3 },
        ],
      },
      {
        team_id: 'red',
        strokes: 5,
        player_scores: [
          { player_id: 'p2', strokes: 5 },
          { player_id: 'p4', strokes: 6 },
        ],
      },
    ],
    leader_team_id: 'blue',
    lead: 2,
    holes_remaining: 15,
    decided: false,
  },
]

function card(props: Record<string, unknown> = {}) {
  return mount(MatchScorecard, {
    props: {
      holeStates,
      leftTeam,
      rightTeam,
      leftLabel: 'JR / KV',
      rightLabel: 'HB / CM',
      formatName: 'Fourball',
      holeInfo,
      tournamentId: 't1',
      matchId: 'm1',
      leftPlayers,
      rightPlayers,
      ...props,
    },
    global: { plugins: [router] },
  })
}
const headers = (w: ReturnType<typeof card>) => w.findAll('thead th').map((t) => t.text().replace(/\s+/g, ' ').trim())
const row = (w: ReturnType<typeof card>, hole: number) => w.findAll('tbody tr').find((r) => r.findAll('td')[0]?.text() === String(hole))!
const cells = (w: ReturnType<typeof card>, hole: number) =>
  row(w, hole)
    .findAll('td')
    .map((c) => c.text())
const pick = async (w: ReturnType<typeof card>, label: string) => {
  await w
    .findAll('[role="radiogroup"] button')
    .find((b) => b.text() === label)!
    .trigger('click')
}

describe('MatchScorecard', () => {
  it('shows each side’s best ball by default', () => {
    const w = card()

    expect(headers(w)).toEqual(['Hole', 'Yds', 'JR / KV', 'HB / CM', 'Match', 'Par', 'Hcp'])
    expect(cells(w, 1).slice(2, 4)).toEqual(['4', '5'])
  })

  it('swaps the two columns for one side’s players', async () => {
    const w = card()

    await pick(w, 'JR / KV')

    expect(headers(w)).toEqual(['Hole', 'Yds', 'JR', 'KV', 'Match', 'Par', 'Hcp'])
    // Rabe 5, Van Walleghem 4 — the individual scores, not the 4 the side played twice.
    expect(cells(w, 1).slice(2, 4)).toEqual(['5', '4'])
  })

  // The tint means the same thing in every view — the hole was won — and within a won hole
  // it falls on the score that took it.
  it('marks the score that took a hole the side won', async () => {
    const w = card()
    await pick(w, 'JR / KV')

    const [rabe, keith] = row(w, 1).findAll('td').slice(2, 4)
    expect(rabe.classes().some((c) => c.includes('tint'))).toBe(false)
    expect(keith.classes().some((c) => c.includes('tint'))).toBe(true)
  })

  // A low score in a hole nobody won took nothing, so being the better of the pair is not
  // on its own worth marking.
  it('marks nothing on a hole the side did not win', async () => {
    const w = card()
    await pick(w, 'JR / KV')

    const marked = row(w, 2)
      .findAll('td')
      .slice(2, 4)
      .filter((c) => c.classes().some((k) => k.includes('tint')))
    expect(marked).toHaveLength(0)
  })

  it('marks both when both players made the score that won it', async () => {
    const w = card()
    await pick(w, 'JR / KV')

    const marked = row(w, 3)
      .findAll('td')
      .slice(2, 4)
      .filter((c) => c.classes().some((k) => k.includes('tint')))
    expect(marked).toHaveLength(2)
  })

  it('paints both columns in that side’s colour', async () => {
    const w = card()
    await pick(w, 'HB / CM')

    const dots = w.findAll('thead th span[style]')
    expect(dots).toHaveLength(2)
    expect(dots.every((d) => d.attributes('style')?.includes('red'))).toBe(true)
  })

  it('totals the columns it is showing', async () => {
    const w = card()
    await pick(w, 'JR / KV')

    // Rabe 5 + 4 + 3 = 12, Van Walleghem 4 + 4 + 3 = 11.
    const out = w.findAll('tbody tr').find((r) => r.text().startsWith('Out'))!
    expect(
      out
        .findAll('td')
        .slice(2, 4)
        .map((c) => c.text()),
    ).toEqual(['12', '11'])
  })

  // Singles fields one a side, so there is nothing to split.
  it('offers no switch where a side is one player', () => {
    const w = card({ formatName: 'Singles', leftPlayers: [leftPlayers[0]], rightPlayers: [rightPlayers[0]] })

    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
  })

  // Alt Shot and Scotch field two a side and record one ball, so player_scores comes back
  // empty. Splitting on player count alone offered the switch and then showed 18 dashes.
  it('offers no switch for a one-ball format, whatever the side size', () => {
    const w = card({ formatName: 'Alt Shot' })

    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
  })

  // The admin UI caps a side at two, but the API does not, and a third player used to
  // render a third header against a two-colour list — a TypeError that killed the page.
  it('offers no switch, and renders, when a side has more than two', () => {
    const third = { player_id: 'p5', first_name: 'Sam', last_name: 'Extra' }
    const w = card({ leftPlayers: [...leftPlayers, third] })

    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
    expect(w.findAll('thead th')).toHaveLength(7)
  })
})
