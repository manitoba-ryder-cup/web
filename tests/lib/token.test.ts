import { describe, it, expect } from 'vitest'
import { scopesFrom } from '@/lib/token'

// A payload the way heimdall issues one. Unsigned here: nothing verifies it, which is the
// point — the answer decides what to offer, and the services decide what is allowed.
function tokenWith(payload: object): string {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${body}.signature`
}

describe('scopesFrom', () => {
  it('reads the scopes a token carries', () => {
    expect(scopesFrom(tokenWith({ scopes: ['scorecard:scores:write'] }))).toEqual(['scorecard:scores:write'])
  })

  // heimdall omits the claim entirely when a user holds none, so this is the ordinary
  // shape of a token with no privileges rather than a malformed one.
  it('reads no scopes when the claim is absent', () => {
    expect(scopesFrom(tokenWith({ user_id: 'abc' }))).toEqual([])
  })

  // Anything unreadable must offer nothing rather than throw on the way to rendering a menu.
  it('yields nothing for a token it cannot read', () => {
    expect(scopesFrom(null)).toEqual([])
    expect(scopesFrom('')).toEqual([])
    expect(scopesFrom('not-a-jwt')).toEqual([])
    expect(scopesFrom('header..signature')).toEqual([])
    expect(scopesFrom('header.bm90IGpzb24.signature')).toEqual([])
    expect(scopesFrom(tokenWith({ scopes: 'not-an-array' }))).toEqual([])
    expect(scopesFrom(tokenWith({ scopes: [1, 'ok', null] }))).toEqual(['ok'])
  })
})
