// @vitest-environment node
// Node rather than jsdom: these exercise real Request/Response/Headers, and Headers
// .getSetCookie() is only there in the Node build.
import { describe, it, expect } from 'vitest'
import { isCacheable, isStorable, rewriteCookiePath } from '../../worker/src/proxy'

const anonymousGet = () => new Request('https://manitobarydercup.com/api/scorecard/v1/tournaments')

describe('what may be served from the edge', () => {
  it('caches an anonymous GET', () => {
    expect(isCacheable(anonymousGet())).toBe(true)
  })

  // The rule the live leaderboard rests on. Only scorers hold a token, and a scorer
  // submits a hole then immediately refetches — handing them their own pre-submission
  // data is the one staleness that would actually mislead someone.
  it('never caches a request carrying a token', () => {
    const req = new Request(anonymousGet(), { headers: { Authorization: 'Bearer t' } })
    expect(isCacheable(req)).toBe(false)
  })

  // A session cookie means the response is somebody's own view of their own state.
  it('never caches a request carrying a cookie', () => {
    const req = new Request(anonymousGet(), { headers: { Cookie: 'refresh_token=x' } })
    expect(isCacheable(req)).toBe(false)
  })

  it('never caches a write', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const req = new Request('https://manitobarydercup.com/api/scorecard/v1/scores', { method })
      expect(isCacheable(req), method).toBe(false)
    }
  })
})

describe('what may be stored', () => {
  const withCacheControl = (value: string, status = 200) => new Response('{}', { status, headers: { 'Cache-Control': value } })

  it('stores a 200 the origin marked public', () => {
    expect(isStorable(withCacheControl('public, max-age=60'))).toBe(true)
  })

  // The services mark authenticated reads and every error no-store; this is the check
  // that keeps the Worker from second-guessing them.
  it('respects no-store', () => {
    expect(isStorable(withCacheControl('no-store'))).toBe(false)
  })

  it('stores nothing without an explicit public directive', () => {
    expect(isStorable(new Response('{}', { status: 200 }))).toBe(false)
    expect(isStorable(withCacheControl('max-age=60'))).toBe(false)
  })

  // "public" must be a directive, not a substring of one.
  it('is not fooled by a directive that merely contains the word', () => {
    expect(isStorable(withCacheControl('no-cache, x-publisher=1'))).toBe(false)
  })

  // A cached error outlives whatever caused it.
  it('never stores an error, even one marked public', () => {
    for (const status of [301, 404, 500]) {
      expect(isStorable(withCacheControl('public, max-age=60', status)), String(status)).toBe(false)
    }
  })

  // The Cache API rejects these outright rather than ignoring them.
  it('never stores a response that sets a cookie', () => {
    const res = new Response('{}', {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
    res.headers.append('Set-Cookie', 'session=abc; Path=/')
    expect(isStorable(res)).toBe(false)
  })
})

// Untested until now, and the failure mode is quiet: login works, then sessions stop
// refreshing once the access token expires.
describe('re-anchoring the refresh cookie', () => {
  it('moves heimdall’s refresh path under the proxy prefix', () => {
    const got = rewriteCookiePath('refresh_token=x; Path=/v1/refresh; HttpOnly', '/api/auth')
    expect(got).toContain('Path=/api/auth/v1/refresh')
  })

  it('re-anchors a root-scoped cookie', () => {
    expect(rewriteCookiePath('a=b; Path=/', '/api/auth')).toContain('Path=/api/auth')
  })

  it('leaves any other path alone', () => {
    const cookie = 'a=b; Path=/somewhere/else'
    expect(rewriteCookiePath(cookie, '/api/auth')).toBe(cookie)
  })

  it('keeps the other attributes', () => {
    const got = rewriteCookiePath('refresh_token=x; Path=/v1/refresh; HttpOnly; Secure; SameSite=Strict', '/api/auth')
    expect(got).toContain('HttpOnly')
    expect(got).toContain('Secure')
    expect(got).toContain('SameSite=Strict')
  })
})
