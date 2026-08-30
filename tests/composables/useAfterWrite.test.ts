import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { QueryClient, VueQueryPlugin, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAfterWrite, useAfterHoleWrite } from '@/composables/useAfterWrite'
import { q } from '@/api/queries'
import type { MatchResult, ScoreSubmissionResult } from '@/api/types'

// `tests/setup.ts` installs the plugin with a client of its own in a beforeEach, and that
// install wins — so the cache is reached through `useQueryClient` rather than held from outside.
const mountWithSetup = <T>(setup: () => T) =>
  mount(defineComponent({ setup, template: '<div/>' }), { global: { plugins: [VueQueryPlugin] } })

// One query per key, so a write can be watched for which of them it reaches.
function mountWith(keys: readonly (readonly unknown[])[]) {
  const fetches = new Map<string, number>()
  const w = mountWithSetup(() => {
    for (const key of keys) {
      const name = JSON.stringify(key)
      useQuery({
        queryKey: key,
        queryFn: () => {
          fetches.set(name, (fetches.get(name) ?? 0) + 1)
          return Promise.resolve(name)
        },
      })
    }
    return { afterWrite: useAfterWrite() }
  })
  return { w, count: (key: readonly unknown[]) => fetches.get(JSON.stringify(key)) ?? 0 }
}

describe('useAfterWrite', () => {
  // A list of keys is only right until the next view is added and nobody comes back here.
  // The dashboard and the cup page were missing from one, and the player page after them.
  it('reaches a page nobody remembered to list', async () => {
    const player = ['player', 'p1']
    const { w, count } = mountWith([player])
    await flushPromises()
    expect(count(player)).toBe(1)

    await w.vm.afterWrite()
    await flushPromises()

    expect(count(player)).toBe(2)
  })

  // No exception any more: it skipped the match because each view held a copy under a key of
  // its own. One copy now, and the entry page asks for nothing on its own once it has loaded.
  it('reaches a match as readily as anything else', async () => {
    const scores = ['match', 'm1', 'scores']
    const { w, count } = mountWith([scores])
    await flushPromises()
    expect(count(scores)).toBe(1)

    await w.vm.afterWrite()
    await flushPromises()

    expect(count(scores)).toBe(2)
  })
})

describe('useAfterHoleWrite', () => {
  const matchId = 'm1'
  const tournamentId = 't1'
  const row = (over: Partial<MatchResult> = {}) =>
    ({ match_id: matchId, finished: false, leader_team_id: null, lead: 0, holes_remaining: 18, hole_results: [], ...over }) as MatchResult
  const answer = (over: Partial<ScoreSubmissionResult> = {}) =>
    ({
      finished: false,
      winner_team_id: null,
      leader_team_id: 'blue',
      lead: 2,
      holes_remaining: 14,
      holes: [{ hole_number: 4, team_scores: [], leader_team_id: 'blue', lead: 2, holes_remaining: 14, decided: false }],
      hole_results: ['blue', null, 'blue', 'blue'],
      ...over,
    }) as ScoreSubmissionResult

  function mountHook(seed: (c: QueryClient) => void) {
    let queryClient!: QueryClient
    const w = mountWithSetup(() => {
      queryClient = useQueryClient()
      return { afterHoleWrite: useAfterHoleWrite() }
    })
    seed(queryClient)
    return { w, queryClient }
  }

  it('leaves the card holding the holes the write answered with', () => {
    const { w, queryClient } = mountHook((c) => c.setQueryData(q.matchScores(matchId).key, []))

    w.vm.afterHoleWrite(tournamentId, matchId, answer())

    expect(queryClient.getQueryData(q.matchScores(matchId).key)).toEqual(answer().holes)
  })

  // Only the match written moves, and only the part of it a score can move: the row also
  // carries the lineup, the tee time and the course, none of which a hole touches.
  it('moves the written match in the standing and leaves the others alone', () => {
    const other = row({ match_id: 'm2' })
    const { w, queryClient } = mountHook((c) =>
      c.setQueryData(q.results(tournamentId).key, [row({ course_name: 'Clear Lake' } as Partial<MatchResult>), other]),
    )

    w.vm.afterHoleWrite(tournamentId, matchId, answer({ finished: true, winner_team_id: 'blue' }))

    const rows = queryClient.getQueryData<MatchResult[]>(q.results(tournamentId).key)!
    expect(rows[1]).toBe(other)
    expect(rows[0]).toMatchObject({ finished: true, winner_team_id: 'blue', lead: 2, hole_results: ['blue', null, 'blue', 'blue'] })
    expect(rows[0].course_name).toBe('Clear Lake')
    expect('holes' in rows[0]).toBe(false)
  })

  // An API that has not shipped the new shape answers with the status alone, and writing the
  // standing from that alone leaves a match reading further on than its own scorecard.
  it('reads the match back when the answer carries no holes', async () => {
    const { w, queryClient } = mountHook((c) => {
      c.setQueryData(q.matchScores(matchId).key, [])
      c.setQueryData(q.results(tournamentId).key, [row()])
    })
    const refetched = vi.spyOn(queryClient, 'refetchQueries')

    const old = answer({ finished: true, lead: 5 }) as Partial<ScoreSubmissionResult>
    delete old.holes
    delete old.hole_results
    await w.vm.afterHoleWrite(tournamentId, matchId, old as ScoreSubmissionResult)

    expect(refetched).toHaveBeenCalled()
    // Untouched, not half-moved: the standing must not carry a score the card does not.
    const rows = queryClient.getQueryData<MatchResult[]>(q.results(tournamentId).key)!
    expect(rows[0]).toMatchObject({ finished: false, lead: 0 })
  })

  // The page it returns to must not fetch what it was just handed, which means the write has
  // to leave those two fresh rather than merely up to date.
  it('leaves what it wrote fresh, so the card it returns to asks for nothing', () => {
    const { w, queryClient } = mountHook((c) => {
      c.setQueryData(q.matchScores(matchId).key, [])
      c.setQueryData(q.results(tournamentId).key, [row()])
      // Seeded so the assertion below has something to be true of: an absent query reports
      // no state at all, which reads as "not fresh" however the write behaved.
      c.setQueryData(q.teams(tournamentId).key, [])
    })

    w.vm.afterHoleWrite(tournamentId, matchId, answer())

    expect(queryClient.getQueryState(q.matchScores(matchId).key)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(q.results(tournamentId).key)?.isInvalidated).toBe(false)
    // The team points move when a match ends and the write cannot say by how much, so what it
    // could not derive is left stale for the next page showing it to ask about.
    expect(queryClient.getQueryState(q.teams(tournamentId).key)?.isInvalidated).toBe(true)
  })

  // Par, yardage and stroke index are the course's, and a scored match's tee set is frozen, so
  // marking it stale spends a request per hole on an answer that cannot have changed.
  it('leaves the tee set alone, which a score cannot move', () => {
    const { w, queryClient } = mountHook((c) => {
      c.setQueryData(q.matchScores(matchId).key, [])
      c.setQueryData(q.matchHoles(matchId).key, [])
      c.setQueryData(q.results(tournamentId).key, [row()])
    })

    w.vm.afterHoleWrite(tournamentId, matchId, answer())

    expect(queryClient.getQueryState(q.matchHoles(matchId).key)?.isInvalidated).toBe(false)
  })
})
