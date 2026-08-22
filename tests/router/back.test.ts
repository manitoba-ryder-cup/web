import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import router from '@/router'

// The header renders this purely from the current route, so it is tested the same way:
// hand it a route and ask what link it yields.
function backFor(path: string, query: Record<string, string> = {}) {
  const record = router.resolve({ path, query })
  const meta = record.meta.back
  return meta?.({ ...record, query } as unknown as RouteLocationNormalizedLoaded) ?? null
}

describe('a profile’s back link', () => {
  it('offers this year’s teams by default', () => {
    expect(backFor('/players/p1')).toEqual({ to: { name: 'teams' }, label: 'Teams' })
  })

  it('offers the participants list to anyone who arrived from it', () => {
    expect(backFor('/players/p1', { from: 'history' })).toEqual({
      to: { name: 'tournaments', hash: '#participants' },
      label: 'History',
    })
  })

  // An unknown origin is not a reason to send someone nowhere.
  it('falls back to this year’s teams for a `from` it does not know', () => {
    expect(backFor('/players/p1', { from: 'elsewhere' })).toEqual({ to: { name: 'teams' }, label: 'Teams' })
  })
})

// Home screens are installed against the old address. Navigated rather than resolved: a
// redirect applies on the way through, so resolving alone reports the redirect record.
describe('the old players address', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('still lands on this year’s teams', async () => {
    await router.push('/players')

    expect(router.currentRoute.value.name).toBe('teams')
  })

  it('does not swallow a player profile', async () => {
    await router.push('/players/p1')

    expect(router.currentRoute.value.name).toBe('player')
  })
})
