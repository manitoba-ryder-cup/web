import { describe, it, expect } from 'vitest'
import { groupIntoSessions, currentSession } from '@/lib/sessions'
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

describe('currentSession', () => {
  it('is the next to tee off before anything starts', () => {
    const s = currentSession([match({ tee_time: FRI_AM, format_name: 'Fourball' }), match({ tee_time: SAT_AM, format_name: 'Singles' })])
    expect(s?.format).toBe('Fourball')
  })

  // A session that has teed off is still the current one while any of it is unplayed —
  // it does not hand over to the next until it is done.
  it('stays on a session that is under way', () => {
    const s = currentSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: FRI_PM, format_name: 'Alt Shot', hole_results: ['t1'] }),
      match({ tee_time: SAT_AM, format_name: 'Singles' }),
    ])
    expect(s?.format).toBe('Alt Shot')
  })

  it('moves on once a session is done', () => {
    const s = currentSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: SAT_AM, format_name: 'Singles' }),
    ])
    expect(s?.format).toBe('Singles')
  })

  // Nothing is next when the cup is over; the standing is the answer by then.
  it('is nothing once every match has finished', () => {
    const s = currentSession([
      match({ tee_time: FRI_AM, format_name: 'Fourball', finished: true }),
      match({ tee_time: SAT_AM, format_name: 'Singles', finished: true }),
    ])
    expect(s).toBeNull()
  })

  it('is nothing when there is no schedule', () => {
    expect(currentSession([])).toBeNull()
  })
})
