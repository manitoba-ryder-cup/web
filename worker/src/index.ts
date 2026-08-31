/**
 * Same-origin API proxy, mirroring the dev Vite proxy in ../vite.config.ts — the two have to
 * agree, and a change to one is nearly always a change to both.
 */

import { isCacheable, isStorable, resolveRoute, rewriteCookiePath, upstreamUrl } from './proxy'

export interface Env {
  /** Cloud Run URL for heimdall, e.g. https://heimdall-abc123-uc.a.run.app */
  HEIMDALL_URL: string
  /** Cloud Run URL for scorecard, e.g. https://scorecard-abc123-uc.a.run.app */
  SCORECARD_URL: string
  /**
   * Enforced by both Cloud Run services, which 403 a request missing or mismatching it. Must
   * equal the `proxy-secret` in Secret Manager that the services read.
   */
  PROXY_SECRET?: string
}

// In the API's envelope, so a caller cannot tell this proxy's failures from the API's.
function apiError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const route = resolveRoute(url.pathname)
    if (!route) return apiError(404, 'Not found')

    const origin = env[route.target]
    if (!origin) return apiError(502, 'Proxy target not configured')

    const cache = caches.default
    const cacheable = isCacheable(request)
    if (cacheable) {
      const hit = await cache.match(request)
      if (hit) return hit
    }

    const headers = new Headers(request.headers)
    // Let fetch set Host from the Cloud Run URL — forwarding the edge Host would misroute.
    headers.delete('host')
    if (env.PROXY_SECRET) headers.set('X-Proxy-Secret', env.PROXY_SECRET)

    const upstream = await fetch(upstreamUrl(origin, route.prefix, url.pathname, url.search), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })

    const response = new Response(upstream.body, upstream)

    if (route.rewriteCookies) {
      const cookies = upstream.headers.getSetCookie()
      if (cookies.length) {
        response.headers.delete('set-cookie')
        for (const cookie of cookies) {
          response.headers.append('set-cookie', rewriteCookiePath(cookie, route.prefix))
        }
      }
    }

    // waitUntil so filling the cache never delays the response, and clone because a body
    // can only be read once.
    if (cacheable && isStorable(response)) {
      ctx.waitUntil(cache.put(request, response.clone()))
    }

    return response
  },
} satisfies ExportedHandler<Env>
