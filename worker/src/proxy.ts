/**
 * The proxy's decisions, with no Cloudflare global touched — so this type-checks and tests
 * against plain objects rather than the Workers runtime.
 */

export interface Route {
  prefix: string
  /** Which Env var holds the upstream origin. */
  target: 'HEIMDALL_URL' | 'SCORECARD_URL'
  rewriteCookies: boolean
}

// Longest prefixes first so `/api/scorecard` can never be shadowed by a broader rule.
export const ROUTES: Route[] = [
  { prefix: '/api/scorecard', target: 'SCORECARD_URL', rewriteCookies: false },
  { prefix: '/api/auth', target: 'HEIMDALL_URL', rewriteCookies: true },
]

export function resolveRoute(pathname: string): Route | undefined {
  return ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
}

/** Strip the `/api/<service>` prefix; the Go services are mounted at root. */
export function upstreamUrl(origin: string, prefix: string, pathname: string, search: string): string {
  return origin.replace(/\/$/, '') + (pathname.slice(prefix.length) || '/') + search
}

/**
 * Anonymous GETs only. Only scorers hold a token, and a scorer submits a hole then refetches,
 * so handing them their own pre-submission data is the one staleness that would mislead.
 */
export function isCacheable(request: Request): boolean {
  return request.method === 'GET' && !request.headers.has('Authorization') && !request.headers.has('Cookie')
}

/**
 * The services decide what is cacheable, because they are what knows whether a tournament is
 * being scored right now.
 */
export function isStorable(response: Response): boolean {
  return (
    response.status === 200 &&
    /(^|,)\s*public\b/.test(response.headers.get('Cache-Control') ?? '') &&
    response.headers.getSetCookie().length === 0
  )
}

/**
 * Re-anchor a Set-Cookie Path under the proxied prefix: /v1/refresh becomes
 * /api/auth/v1/refresh, and / becomes /api/auth.
 */
export function rewriteCookiePath(cookie: string, prefix: string): string {
  return cookie.replace(/;\s*Path=\/v1\/refresh\b/i, `; Path=${prefix}/v1/refresh`).replace(/;\s*Path=\/(?=\s*(;|$))/i, `; Path=${prefix}`)
}
