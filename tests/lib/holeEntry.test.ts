import { describe, it, expect } from 'vitest'
import { buildHoleEntries } from '@/lib/holeEntry'
import type { Hole, HoleStatus, MatchSide } from '@/api/types'

const blue: MatchSide = {
  team_id: 'blue',
  players: [
    { player_id: 'p1', first_name: 'Travis', last_name: 'Bale' },
    { player_id: 'p2', first_name: 'Sam', last_name: 'Phin' },
  ],
}
const red: MatchSide = {
  team_id: 'red',
  players: [
    { player_id: 'p3', first_name: 'Dustin', last_name: 'Johnson' },
    { player_id: 'p4', first_name: 'Rory', last_name: 'McIlroy' },
  ],
}
const singlesBlue: MatchSide = { team_id: 'blue', players: [blue.players[0]] }
const singlesRed: MatchSide = { team_id: 'red', players: [red.players[0]] }

// An 18-hole par-4 course, so a hole's contribution to par is always 4 unless overridden.
const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, hdcp: i + 1, yards: 400 }))

function status(hole: number, teamScores: HoleStatus['team_scores']): HoleStatus {
  return { hole_number: hole, team_scores: teamScores, leader_team_id: null, lead: 0, holes_remaining: 18 - hole, decided: false }
}
// One singles hole where each side's lone player posted a score.
function singlesHole(hole: number, bluePlayerStrokes: number, redPlayerStrokes: number): HoleStatus {
  return status(hole, [
    { team_id: 'blue', strokes: bluePlayerStrokes, player_scores: [{ player_id: 'p1', strokes: bluePlayerStrokes }] },
    { team_id: 'red', strokes: redPlayerStrokes, player_scores: [{ player_id: 'p3', strokes: redPlayerStrokes }] },
  ])
}

const at = (holeNumber: number, perPlayer = true, holeStates: HoleStatus[] = []) => ({ perPlayer, holeNumber, holes, holeStates })

describe('buildHoleEntries', () => {
  // Most of a round is a tap or two off par, so that is where an unplayed hole opens.
  it('starts an unscored hole on par', () => {
    const entries = buildHoleEntries([singlesBlue, singlesRed], at(7))

    expect(entries.map((e) => e.strokes)).toEqual([4, 4])
  })

  // The seed is the hole's own par, not a constant: opening a par three on 4 would arm a
  // bogey for anyone who took the offer.
  it('seeds each hole from its own par', () => {
    const parThree = holes.map((h) => (h.number === 7 ? { ...h, par: 3 } : h))
    const entries = buildHoleEntries([singlesBlue, singlesRed], { ...at(7), holes: parThree })

    expect(entries.map((e) => e.strokes)).toEqual([3, 3])
  })

  it('leaves a hole with no tee set behind it unchosen', () => {
    const entries = buildHoleEntries([singlesBlue, singlesRed], { ...at(7), holes: [] })

    expect(entries.map((e) => e.strokes)).toEqual([null, null])
  })

  it('opens a side with no score of its own on par, on a hole the other side played', () => {
    const scored = status(7, [
      { team_id: 'blue', strokes: 4, player_scores: [{ player_id: 'p1', strokes: 4 }] },
      { team_id: 'red', strokes: 6, player_scores: [] },
    ])

    const entries = buildHoleEntries([singlesBlue, singlesRed], at(7, true, [scored]))

    expect(entries.map((e) => e.strokes)).toEqual([4, 4])
  })

  it('opens a whole unscored hole on par for both sides', () => {
    const entries = buildHoleEntries([blue, red], at(7, false))

    expect(entries.map((e) => e.strokes)).toEqual([4, 4])
  })

  it('prefills each player from the recorded score', () => {
    const entries = buildHoleEntries([singlesBlue, singlesRed], at(7, true, [singlesHole(7, 4, 6)]))

    expect(entries.map((e) => [e.playerId, e.strokes])).toEqual([
      ['p1', 4],
      ['p3', 6],
    ])
  })

  it('gives each fourball player their own score, not the side best ball', () => {
    // The regression this exists for: the team score is the better of the two, so reading
    // it for both would show p2 a 4 they never made.
    const scored = status(7, [
      {
        team_id: 'blue',
        strokes: 4,
        player_scores: [
          { player_id: 'p1', strokes: 4 },
          { player_id: 'p2', strokes: 7 },
        ],
      },
      {
        team_id: 'red',
        strokes: 5,
        player_scores: [
          { player_id: 'p3', strokes: 5 },
          { player_id: 'p4', strokes: 6 },
        ],
      },
    ])

    const entries = buildHoleEntries([blue, red], at(7, true, [scored]))

    expect(entries.map((e) => [e.playerId, e.strokes])).toEqual([
      ['p1', 4],
      ['p2', 7],
      ['p3', 5],
      ['p4', 6],
    ])
  })

  it('prefills a one-ball format from the team score', () => {
    const scored = status(7, [
      { team_id: 'blue', strokes: 5, player_scores: [] },
      { team_id: 'red', strokes: 3, player_scores: [] },
    ])

    const entries = buildHoleEntries([blue, red], at(7, false, [scored]))

    expect(entries.map((e) => [e.key, e.playerId, e.name, e.strokes])).toEqual([
      ['blue', null, 'Bale / Phin', 5],
      ['red', null, 'Johnson / McIlroy', 3],
    ])
  })

  // A par five, so par is not the 4 p1 recorded: the side's strokes are the better ball, and
  // reading them for a player who has none would show a score nobody made.
  it("opens a player with no recorded score on par rather than a teammate's", () => {
    const parFive = holes.map((h) => (h.number === 7 ? { ...h, par: 5 } : h))
    const scored = status(7, [{ team_id: 'blue', strokes: 4, player_scores: [{ player_id: 'p1', strokes: 4 }] }])

    const entries = buildHoleEntries([blue, red], { perPlayer: true, holeNumber: 7, holes: parFive, holeStates: [scored] })

    expect(entries.map((e) => e.strokes)).toEqual([4, 5, 5, 5])
  })

  describe('running totals', () => {
    it('sums the holes played before this one', () => {
      // Three bogeys on par 4s, now on hole 4: 15 strokes against 12 of par.
      const played = [singlesHole(1, 5, 4), singlesHole(2, 5, 4), singlesHole(3, 5, 3)]

      const entries = buildHoleEntries([singlesBlue, singlesRed], at(4, true, played))

      expect(entries.map((e) => [e.priorStrokes, e.priorPar])).toEqual([
        [15, 12],
        [11, 12],
      ])
    })

    it('starts at zero on the first hole', () => {
      const entries = buildHoleEntries([singlesBlue, singlesRed], at(1, true, [singlesHole(1, 5, 4)]))

      expect(entries.map((e) => [e.priorStrokes, e.priorPar])).toEqual([
        [0, 0],
        [0, 0],
      ])
    })

    it('excludes the hole being entered and everything after it', () => {
      // Re-opening hole 2 of a played round: only hole 1 counts toward the total.
      const played = [singlesHole(1, 5, 4), singlesHole(2, 6, 4), singlesHole(3, 7, 4)]

      const entries = buildHoleEntries([singlesBlue, singlesRed], at(2, true, played))

      expect(entries.map((e) => [e.priorStrokes, e.priorPar])).toEqual([
        [5, 4],
        [4, 4],
      ])
    })

    it('counts each fourball player separately', () => {
      const hole1 = status(1, [
        {
          team_id: 'blue',
          strokes: 4,
          player_scores: [
            { player_id: 'p1', strokes: 4 },
            { player_id: 'p2', strokes: 7 },
          ],
        },
      ])

      const entries = buildHoleEntries([blue], at(2, true, [hole1]))

      expect(entries.map((e) => [e.playerId, e.priorStrokes])).toEqual([
        ['p1', 4],
        ['p2', 7],
      ])
    })

    it('totals the team score for a one-ball format', () => {
      const played = [
        status(1, [{ team_id: 'blue', strokes: 5, player_scores: [] }]),
        status(2, [{ team_id: 'blue', strokes: 3, player_scores: [] }]),
      ]

      const entries = buildHoleEntries([blue], at(3, false, played))

      expect(entries.map((e) => [e.priorStrokes, e.priorPar])).toEqual([[8, 8]])
    })

    it('skips a hole the player never scored, par included', () => {
      // Counting a hole's par without its strokes would report the round as under par by
      // a whole hole, so an unscored hole contributes to neither side of the comparison.
      const played = [singlesHole(1, 5, 4), status(2, [{ team_id: 'red', strokes: 4, player_scores: [{ player_id: 'p3', strokes: 4 }] }])]

      const entries = buildHoleEntries([singlesBlue, singlesRed], at(3, true, played))

      expect(entries.map((e) => [e.priorStrokes, e.priorPar])).toEqual([
        [5, 4], // blue only played hole 1
        [8, 8], // red played both
      ])
    })

    it('uses each hole its own par', () => {
      const mixed: Hole[] = [
        { number: 1, par: 5, hdcp: 1, yards: 520 },
        { number: 2, par: 3, hdcp: 2, yards: 150 },
        { number: 3, par: 4, hdcp: 3, yards: 400 },
      ]
      const played = [singlesHole(1, 5, 6), singlesHole(2, 3, 4)]

      const entries = buildHoleEntries([singlesBlue], { perPlayer: true, holeNumber: 3, holes: mixed, holeStates: played })

      expect([entries[0].priorStrokes, entries[0].priorPar]).toEqual([8, 8])
    })
  })
})
