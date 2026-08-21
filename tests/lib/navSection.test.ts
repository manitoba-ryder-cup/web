import { describe, it, expect } from 'vitest'
import { navSection } from '@/lib/navSection'

const at = (path: string, query: Record<string, unknown> = {}) => navSection({ path, query })

describe('navSection', () => {
  it('names the section for each of the four destinations', () => {
    expect(at('/')).toBe('home')
    expect(at('/tournaments/t2')).toBe('scores')
    expect(at('/teams')).toBe('teams')
    expect(at('/tournaments')).toBe('history')
  })

  // Home is `/` and History is `/tournaments`, which the screens below them all sit under.
  // A prefix test would light two sections at once on every drill-in.
  it('keeps a drill-in under the section it was reached through', () => {
    expect(at('/tournaments/t2/matches/m1')).toBe('scores')
    expect(at('/tournaments/t2/matches/m1/holes/4')).toBe('scores')
  })

  // The profile is the one screen two lists lead to, and it is the same `from` the back
  // link reads — so the nav and the back link can never offer different lists.
  it('files a profile under the list that opened it', () => {
    expect(at('/players/p1')).toBe('teams')
    expect(at('/players/p1', { from: 'history' })).toBe('history')
    expect(at('/players/p1', { from: 'elsewhere' })).toBe('teams')
  })

  // Admin and login are not destinations the bar offers; lighting a tab there would claim
  // the visitor is somewhere they are not.
  it('leaves screens outside the four unmarked', () => {
    expect(at('/admin')).toBeNull()
    expect(at('/login')).toBeNull()
  })
})
