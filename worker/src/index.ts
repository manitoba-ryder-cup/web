/**
 * Same-origin API proxy for manitobarydercup.com.
 *
 * The SPA (served by Cloudflare Pages) calls relative paths — `/api/auth/*` and
 * `/api/scorecard/*` — so the browser never needs CORS and never sees the Cloud Run
 * URLs. This Worker is bound to the route `manitobarydercup.com/api/*` (see
 * wrangler.toml); everything else falls through to Pages.
 *
 * It mirrors the dev Vite proxy exactly (../vite.config.ts) and lives beside it for that
 * reason — the two have to agree, and a change to one is nearly always a change to both:
 *   - strips the `/api/<service>` prefix (the Go services are mounted at root), and
 *   - rewrites heimdall's refresh-token cookie Path from `/v1/refresh` (heimdall-
 *     relative) to `/api/auth/v1/refresh`, so the browser sends it back.
 *
 * Because bots hit this edge Worker before any origin, Cloudflare's Bot Fight Mode,
 * WAF, and rate-limit rules filter traffic before it can ever wake Cloud Run.
 *
 * Anonymous GETs the services mark public are also served from the edge cache. That
 * matters more than it sounds: the History page fans out to one request per cup, and a
 * hit skips both the Cloud Run cold start and the round trips to a database in another
 * region. What may be cached is the origin's decision, not this Worker's.
 *
 * The decisions themselves live in proxy.ts, which is free of Cloudflare globals and is
 * where the tests point. This file is only the edge wiring.
 */

import { isCacheable, isStorable, resolveRoute, rewriteCookiePath, upstreamUrl } from './proxy'

export interface Env {
  /** Cloud Run URL for heimdall, e.g. https://heimdall-abc123-uc.a.run.app */
  HEIMDALL_URL: string
  /** Cloud Run URL for scorecard, e.g. https://scorecard-abc123-uc.a.run.app */
  SCORECARD_URL: string
  /**
   * Shared secret added as `X-Proxy-Secret` on every upstream request. Both Cloud Run
   * services enforce it (knowhere's RequireProxySecret middleware): requests missing or
   * mismatching it get a 403, except the health check. Must equal the `proxy-secret` in
   * Secret Manager that the services read. Leave unset only where the services also run
   * without it (local dev).
   */
  PROXY_SECRET?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const route = resolveRoute(url.pathname)
    if (!route) return new Response('Not found', { status: 404 })

    const origin = env[route.target]
    if (!origin) return new Response('Proxy target not configured', { status: 502 })

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
