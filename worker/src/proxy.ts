/**
 * The proxy's decisions, separated from the Workers runtime that acts on them.
 *
 * Nothing here touches a Cloudflare global, so it type-checks and tests against plain
 * Request/Response like any other module in this repo. index.ts holds the parts that can
 * only run on the edge — the cache, waitUntil, the upstream fetch.
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
 * Anonymous GETs only.
 *
 * The Authorization check is what keeps a live tournament correct: only scorers hold a
 * token, and a scorer submits a hole then immediately refetches, so handing them their own
 * pre-submission data is the one staleness that would genuinely mislead. Cookies are
 * excluded for the same reason — a request carrying a session is somebody's own view of
 * their own state, not a shared spectator read.
 */
export function isCacheable(request: Request): boolean {
  return request.method === 'GET' && !request.headers.has('Authorization') && !request.headers.has('Cookie')
}

/**
 * Only store a 200 the origin explicitly marked public — the services decide what is
 * cacheable (see scorecard's rest/cache.go), because they are what knows whether a
 * tournament is being scored right now.
 *
 * Errors are excluded because a cached 404 outlives whatever caused it, and the Cache API
 * rejects a response carrying Set-Cookie outright, so that is checked rather than thrown on.
 */
export function isStorable(response: Response): boolean {
  return (
    response.status === 200 &&
    /(^|,)\s*public\b/.test(response.headers.get('Cache-Control') ?? '') &&
    response.headers.getSetCookie().length === 0
  )
}

/**
 * Re-anchor a Set-Cookie Path under the proxied prefix:
 *   Path=/v1/refresh -> Path=/api/auth/v1/refresh
 *   Path=/           -> Path=/api/auth
 * Any other Path is left as-is.
 */
export function rewriteCookiePath(cookie: string, prefix: string): string {
  return cookie.replace(/;\s*Path=\/v1\/refresh\b/i, `; Path=${prefix}/v1/refresh`).replace(/;\s*Path=\/(?=\s*(;|$))/i, `; Path=${prefix}`)
}
