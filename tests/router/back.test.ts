import { describe, it, expect } from 'vitest'
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
  it('offers the roster by default', () => {
    expect(backFor('/players/p1')).toEqual({ to: { name: 'players' }, label: 'Players' })
  })

  it('offers the participants list to anyone who arrived from it', () => {
    expect(backFor('/players/p1', { from: 'history' })).toEqual({
      to: { name: 'tournaments', hash: '#participants' },
      label: 'History',
    })
  })

  // An unknown origin is not a reason to send someone nowhere.
  it('falls back to the roster for a `from` it does not know', () => {
    expect(backFor('/players/p1', { from: 'elsewhere' })).toEqual({ to: { name: 'players' }, label: 'Players' })
  })
})
