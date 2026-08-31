import { describe, it, expect } from 'vitest'
import { groupIntoSessions, headlineSession, nextSession, sessionInPlay } from '@/lib/sessions'
import type { MatchResult } from '@/api/types'

function match(over: Partial<MatchResult> & { tee_time: string; format_name: string }): MatchResult {
  return {
    match_id: over.tee_time + over.format_name,
    sides: [],
    hole_results: [],
    finished: false,
    winner_team_id: null,
    leader_team_id: null,
    lead: 0,
    holes_remaining: 18,
    course_name: 'Buffalo Point',
    scoring_opens_at: over.tee_time,
    scoring_closes_at: over.tee_time,
    ...over,
  } as MatchResult
}

const FRI_AM = '2026-09-18T14:00:00Z'
const FRI_PM = '2026-09-18T20:00:00Z'
const SAT_AM = '2026-09-19T14:00:00Z'

describe('groupIntoSessions', () => {
  // A session is a day and a format together — the same format on two days is two
  // sessions, and two formats on one day likewise.
  it('splits by day and by format', () => {
    const sessions = groupIntoSessions([
      match({ tee_time: FRI_AM, format_name: 'Fourball' }),
      match({ tee_time: FRI_PM, format_name: 'Alt Shot' }),
      match({ tee_time: SAT_AM, format_name: 'Fourball' }),
    ])
    expect(sessions).toHaveLength(3)
  })

  it('orders sessions and their matches by tee time', () => {
    const sessions = groupIntoSessions([
      match({ tee_time: SAT_AM, format_name: 'Singles' }),
      match({ tee_time: FRI_PM, format_name: 'Alt Shot' }),
      match({ tee_time: FRI_AM, format_name: 'Fourball' }),
    ])
    expect(sessions.map((s) => s.format)).toEqual(['Fourball', 'Alt Shot', 'Singles'])
  })
})

describe('nextSession', () => {
  it('is the next to tee off before anything starts', () => {
    const s = nextSession([match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: SAT_AM, format_name: 'Singles' })])
    expect(s?.format).toBe('Fourball')
  })

  // A session that has teed off is still the current one while any of it is unplayed —
  // it does not hand over to the next until it is done.
  it('stays on a session that is under way', () => {
    const s = nextSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: FRI_PM, format_name: 'Alt Shot', hole_results: ['t1'] }),
      match({ tee_time: SAT_AM, format_name: 'Singles' }),
    ])
    expect(s?.format).toBe('Alt Shot')
  })

  it('moves on once a session is done', () => {
    const s = nextSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: SAT_AM, format_name: 'Singles' }),
    ])
    expect(s?.format).toBe('Singles')
  })

  // Nothing is next when the cup is over; the standing is the answer by then.
  it('is nothing once every match has finished', () => {
    const s = nextSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: SAT_AM, format_name: 'Singles', finished: true }),
    ])
    expect(s).toBeNull()
  })

  it('is nothing when there is no schedule', () => {
    expect(nextSession([])).toBeNull()
  })
})

describe('sessionInPlay', () => {
  // Every match tees off at its own tee time, so a `now` either side of one decides whether
  // that session has begun.
  const BEFORE_CUP = new Date('2026-09-18T10:00:00Z')
  const DURING_FRI_AM = new Date('2026-09-18T16:00:00Z')
  const DURING_FRI_PM = new Date('2026-09-18T21:00:00Z')

  it('is the session out on the course', () => {
    const s = sessionInPlay(
      [match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_AM,
    )
    expect(s?.format).toBe('Fourball')
  })

  // The gap between sessions: the fourballs are in, the alternate shot has no lineups and no
  // scores because it has not teed off, and the finished session is the one worth reading.
  it('stays on the session just played until the next tees off', () => {
    const s = sessionInPlay(
      [match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_AM,
    )
    expect(s?.format).toBe('Fourball')
  })

  it('hands over once the next session can be scored', () => {
    const s = sessionInPlay(
      [match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_PM,
    )
    expect(s?.format).toBe('Alt Shot')
  })

  it('is nothing before the first session tees off', () => {
    const s = sessionInPlay(
      [match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: SAT_AM, format_name: 'Singles' })],
      BEFORE_CUP,
    )
    expect(s).toBeNull()
  })

  it('is nothing once every match has finished', () => {
    const s = sessionInPlay(
      [
        match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
        match({ tee_time: SAT_AM, format_name: 'Singles', finished: true }),
      ],
      DURING_FRI_PM,
    )
    expect(s).toBeNull()
  })

  it('is nothing when there is no schedule', () => {
    expect(sessionInPlay([])).toBeNull()
  })
})

describe('headlineSession', () => {
  const BEFORE_CUP = new Date('2026-09-18T10:00:00Z')
  const DURING_FRI_AM = new Date('2026-09-18T16:00:00Z')
  const DURING_FRI_PM = new Date('2026-09-18T21:00:00Z')
  const drawn = [{ team_id: 't-blue', players: [{ player_id: 'p1', first_name: 'Bo', last_name: 'Jones' }] }]

  it('leads with the session out on the course', () => {
    const s = headlineSession(
      [match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_AM,
    )
    expect(s?.format).toBe('Fourball')
  })

  // An undrawn session is a column of tee times and nothing else, which is worth less than the
  // results it would replace.
  it('holds the session just played while the next is undrawn', () => {
    const s = headlineSession(
      [match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_AM,
    )
    expect(s?.format).toBe('Fourball')
  })

  it('moves on as soon as the next session is drawn', () => {
    const s = headlineSession(
      [
        match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
        match({ tee_time: FRI_PM, format_name: 'Alt Shot', sides: drawn }),
      ],
      DURING_FRI_AM,
    )
    expect(s?.format).toBe('Alt Shot')
  })

  it('moves on when the next session tees off undrawn', () => {
    const s = headlineSession(
      [match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }), match({ tee_time: FRI_PM, format_name: 'Alt Shot' })],
      DURING_FRI_PM,
    )
    expect(s?.format).toBe('Alt Shot')
  })

  // Nothing has been played to fall back to, so the schedule is still the best thing on offer.
  it('leads with the opening session before the cup, drawn or not', () => {
    const s = headlineSession(
      [match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: SAT_AM, format_name: 'Singles' })],
      BEFORE_CUP,
    )
    expect(s?.format).toBe('Fourball')
  })

  it('is nothing once every match has finished', () => {
    const s = headlineSession(
      [
        match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
        match({ tee_time: SAT_AM, format_name: 'Singles', finished: true }),
      ],
      DURING_FRI_PM,
    )
    expect(s).toBeNull()
  })
})
