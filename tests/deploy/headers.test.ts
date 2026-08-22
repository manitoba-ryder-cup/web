import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Nothing in the app exercises it, so a deletion would ship silently. These assert the
// load-bearing parts; the values themselves are free to change.
const headers = readFileSync(resolve(__dirname, '../../public/_headers'), 'utf8')

function directive(name: string): string {
  const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? ''
  return (
    csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith(name + ' ')) ?? ''
  )
}

describe('public/_headers', () => {
  it.each(['Strict-Transport-Security', 'X-Frame-Options', 'Content-Security-Policy', 'Permissions-Policy', 'X-Robots-Tag'])(
    'sets %s',
    (header) => {
      expect(headers).toContain(header + ':')
    },
  )

  // The whole point of the policy: an injected <script> must not run. A library that wants
  // eval, or a stray inline handler, would be a silent downgrade of exactly that.
  it('never lets scripts run inline or from eval', () => {
    expect(directive('script-src')).toBe("script-src 'self'")
  })

  it('refuses to be framed', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  // Everything the app loads is same-origin; a CDN appearing here means something started
  // shipping third-party code.
  it('allows no third-party origin', () => {
    expect(headers).not.toMatch(/https?:\/\//)
  })

  it('drops the wildcard CORS header Pages sends by default', () => {
    expect(headers).toContain('! Access-Control-Allow-Origin')
  })
})
