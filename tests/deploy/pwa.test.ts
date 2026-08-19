import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The worker is generated at build time, so nothing here mounts it. These pin the config
// choices that are dangerous to get wrong, and the assets the install depends on.
const root = resolve(__dirname, '../..')
const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')

describe('PWA configuration', () => {
  // Scores go stale in seconds and a match view polls every 20 of them. A cached API
  // response is the one thing this must never serve.
  it('never caches the API', () => {
    expect(config).toMatch(/urlPattern:.*\/api\/[\s\S]{0,80}handler: 'NetworkOnly'/)
  })

  // Without the denylist a failed API call is answered with the app's own HTML, which
  // reaches the client as a JSON parse error rather than the status the server sent.
  it('keeps the navigation fallback away from the API', () => {
    expect(config).toContain('navigateFallbackDenylist')
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[\/\^\\\/api\\\//)
  })

  // The previous worker could never be replaced, which is what left every visitor on a
  // dead build. A prompt-based update would put a dialog between a deploy and a phone.
  it('takes updates without asking', () => {
    expect(config).toContain("registerType: 'autoUpdate'")
    expect(config).toContain('skipWaiting: true')
    expect(config).toContain('clientsClaim: true')
  })

  it.each([
    'public/icons/pwa-192x192.png',
    'public/icons/pwa-512x512.png',
    'public/icons/maskable-512x512.png',
    'public/icons/apple-touch-icon-180x180.png',
  ])('ships %s', (icon) => {
    expect(existsSync(resolve(root, icon))).toBe(true)
  })

  // An Android launcher masks the icon to its own shape; without a maskable variant it
  // shrinks the whole thing onto a white tile.
  it('offers a maskable icon', () => {
    expect(config).toContain("purpose: 'maskable'")
  })

  // iOS ignores the manifest's icons on older versions, so the home-screen install falls
  // back to a screenshot of the page unless this is declared.
  it('declares an apple-touch-icon in the HTML', () => {
    expect(readFileSync(resolve(root, 'index.html'), 'utf8')).toContain('rel="apple-touch-icon"')
  })
})
