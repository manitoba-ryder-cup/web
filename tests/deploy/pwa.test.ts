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

  // A prompt-based update puts a dialog between a deploy and a phone in a field.
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

  // Drawn from the palette rather than a second pair existing only here, on the emphasis step:
  // at icon size the page's own blue and red are louder.
  it('draws the icon in the palette colours of the two teams', () => {
    const css = readFileSync(resolve(root, 'src/assets/main.css'), 'utf8')
    const token = (name: string) => css.match(new RegExp(`--color-mrc-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
    const svg = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8')
    expect(svg).toContain(token('blue-strong'))
    expect(svg).toContain(token('red-strong'))
  })

  // iOS ignores the manifest's icons on older versions, so the home-screen install falls
  // back to a screenshot of the page unless this is declared.
  it('declares an apple-touch-icon in the HTML', () => {
    expect(readFileSync(resolve(root, 'index.html'), 'utf8')).toContain('rel="apple-touch-icon"')
  })

  // The meta overrides the manifest, so a mismatch shows as a band of one colour above a
  // header of another — visible only once installed, which is where nobody is looking.
  it('gives the status bar the same colour in the manifest and the HTML', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    const fromHtml = html.match(/name="theme-color" content="([^"]+)"/)?.[1]
    const fromManifest = config.match(/theme_color: '([^']+)'/)?.[1]
    expect(fromHtml).toBe(fromManifest)
  })

  // Whatever colour it is, it has to be the header's, or the two meet in a visible seam.
  it('gives the status bar the header colour', () => {
    const css = readFileSync(resolve(root, 'src/assets/main.css'), 'utf8')
    const ink = css.match(/--color-mrc-ink:\s*(#[0-9a-fA-F]{6})/)?.[1]
    expect(config).toContain(`theme_color: '${ink}'`)
  })
})
