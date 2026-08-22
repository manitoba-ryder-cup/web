import { describe, it, expect } from 'vitest'
import { isCacheable, isStorable, resolveRoute, rewriteCookiePath, upstreamUrl } from '../../worker/src/proxy'

// These are the decisions a regression breaks silently: what is proxied where, what may be
// shared-cached, and whether the refresh cookie reaches the browser.

describe('resolveRoute', () => {
  it('routes each service prefix to its own origin', () => {
    expect(resolveRoute('/api/scorecard/v1/players')?.target).toBe('SCORECARD_URL')
    expect(resolveRoute('/api/auth/v1/login')?.target).toBe('HEIMDALL_URL')
  })

  it('matches a bare prefix as well as a path under it', () => {
    expect(resolveRoute('/api/auth')?.target).toBe('HEIMDALL_URL')
  })

  // A prefix has to end at a segment boundary. Matching on startsWith alone would send
  // /api/scorecards-of-doom upstream to the real service.
  it('does not match a longer word that merely starts with a prefix', () => {
    expect(resolveRoute('/api/scorecardXYZ')).toBeUndefined()
    expect(resolveRoute('/api/authentication')).toBeUndefined()
  })

  it('leaves everything else to Pages', () => {
    expect(resolveRoute('/')).toBeUndefined()
    expect(resolveRoute('/api/')).toBeUndefined()
    expect(resolveRoute('/players')).toBeUndefined()
  })

  // Only heimdall's cookies are re-anchored; rewriting scorecard's would be a no-op at
  // best, and this flag is what index.ts branches on.
  it('marks only the auth route for cookie rewriting', () => {
    expect(resolveRoute('/api/auth')?.rewriteCookies).toBe(true)
    expect(resolveRoute('/api/scorecard')?.rewriteCookies).toBe(false)
  })
})

describe('upstreamUrl', () => {
  it('strips the proxy prefix, since the services are mounted at root', () => {
    expect(upstreamUrl('https://scorecard.run.app', '/api/scorecard', '/api/scorecard/v1/players', '')).toBe(
      'https://scorecard.run.app/v1/players',
    )
  })

  it('preserves the query string', () => {
    expect(upstreamUrl('https://scorecard.run.app', '/api/scorecard', '/api/scorecard/v1/players', '?tier=gold')).toBe(
      'https://scorecard.run.app/v1/players?tier=gold',
    )
  })

  // Stripping the prefix off a bare prefix leaves nothing, which is not a valid path.
  it('turns a bare prefix into a root request', () => {
    expect(upstreamUrl('https://heimdall.run.app', '/api/auth', '/api/auth', '')).toBe('https://heimdall.run.app/')
  })

  it('does not double the slash when the origin has a trailing one', () => {
    expect(upstreamUrl('https://scorecard.run.app/', '/api/scorecard', '/api/scorecard/v1/players', '')).toBe(
      'https://scorecard.run.app/v1/players',
    )
  })
})

describe('isCacheable', () => {
  it('accepts an anonymous GET', () => {
    expect(isCacheable(new Request('https://x/api/scorecard/v1/players'))).toBe(true)
  })

  // A scorer submits a hole then immediately refetches, so serving them their own pre-submission
  // data is the one staleness that genuinely misleads.
  it('refuses a request carrying an Authorization header', () => {
    const req = new Request('https://x/api/scorecard/v1/players', { headers: { Authorization: 'Bearer token' } })
    expect(isCacheable(req)).toBe(false)
  })

  it('refuses a request carrying a Cookie', () => {
    const req = new Request('https://x/api/auth/v1/me', { headers: { Cookie: 'refresh_token=abc' } })
    expect(isCacheable(req)).toBe(false)
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('refuses %s, which changes state', (method) => {
    expect(isCacheable(new Request('https://x/api/scorecard/v1/players', { method }))).toBe(false)
  })
})

describe('isStorable', () => {
  const res = (status: number, headers: Record<string, string> = {}) => new Response('{}', { status, headers })

  it('stores a 200 the origin marked public', () => {
    expect(isStorable(res(200, { 'Cache-Control': 'public, max-age=60' }))).toBe(true)
  })

  // The services decide what may be cached, because only they know whether a cup is being
  // scored right now. Silence is not consent.
  it('refuses a response with no Cache-Control at all', () => {
    expect(isStorable(res(200))).toBe(false)
  })

  it.each(['no-store', 'private, max-age=60', 'max-age=60'])('refuses %s', (cc) => {
    expect(isStorable(res(200, { 'Cache-Control': cc }))).toBe(false)
  })

  // A cached error outlives whatever caused it — a 404 stored during a deploy would
  // survive long after the route came back.
  it.each([404, 500, 502, 301])('refuses status %i even when marked public', (status) => {
    expect(isStorable(res(status, { 'Cache-Control': 'public, max-age=60' }))).toBe(false)
  })

  // The Cache API rejects a response carrying Set-Cookie outright, so this is checked
  // rather than thrown on.
  it('refuses a public response that carries a Set-Cookie', () => {
    const r = res(200, { 'Cache-Control': 'public, max-age=60' })
    r.headers.append('Set-Cookie', 'refresh_token=abc; Path=/api/auth/v1/refresh')
    expect(isStorable(r)).toBe(false)
  })
})

describe('rewriteCookiePath', () => {
  // Behind the proxy the browser would never send that cookie back to /api/auth/v1/refresh, so
  // the session would silently fail to survive a reload.
  it('re-anchors the refresh path under the proxy prefix', () => {
    expect(rewriteCookiePath('refresh_token=abc; Path=/v1/refresh; HttpOnly; Secure', '/api/auth')).toBe(
      'refresh_token=abc; Path=/api/auth/v1/refresh; HttpOnly; Secure',
    )
  })

  it('re-anchors a root path to the prefix itself', () => {
    expect(rewriteCookiePath('session=xyz; Path=/; HttpOnly', '/api/auth')).toBe('session=xyz; Path=/api/auth; HttpOnly')
  })

  it('handles a root path at the very end of the header', () => {
    expect(rewriteCookiePath('session=xyz; Path=/', '/api/auth')).toBe('session=xyz; Path=/api/auth')
  })

  it('leaves any other path alone', () => {
    const cookie = 'session=xyz; Path=/somewhere/else; HttpOnly'
    expect(rewriteCookiePath(cookie, '/api/auth')).toBe(cookie)
  })

  it('matches the attribute case-insensitively, as Set-Cookie allows', () => {
    expect(rewriteCookiePath('refresh_token=abc; path=/v1/refresh', '/api/auth')).toBe('refresh_token=abc; Path=/api/auth/v1/refresh')
  })

  // The two replacements run in sequence, so a path already rewritten to /api/auth/v1/...
  // must not then be caught by the bare-root rule.
  it('does not rewrite twice', () => {
    const once = rewriteCookiePath('refresh_token=abc; Path=/v1/refresh; HttpOnly', '/api/auth')
    expect(rewriteCookiePath(once, '/api/auth')).toBe(once)
  })

  it('preserves the security attributes it does not touch', () => {
    const out = rewriteCookiePath('refresh_token=abc; Path=/v1/refresh; HttpOnly; Secure; SameSite=Strict', '/api/auth')
    expect(out).toContain('HttpOnly')
    expect(out).toContain('Secure')
    expect(out).toContain('SameSite=Strict')
  })
})
