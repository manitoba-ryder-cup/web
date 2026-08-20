/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      // autoUpdate, not prompt: a dialog is one more thing between a deploy and a phone in
      // a field actually running it.
      registerType: 'autoUpdate',
      // The logo and the fallback avatar are on nearly every screen and come to 24KB
      // between them; without these an offline roster is a page of broken images.
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180x180.png', 'img/logo.webp', 'img/default-avatar.webp'],
      manifest: {
        name: 'Manitoba Ryder Cup',
        short_name: 'Ryder Cup',
        description: 'Live scores, matches and players for the Manitoba Ryder Cup.',
        theme_color: '#01366d',
        background_color: '#01366d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The shell only: fonts and photographs are 1.9MB of the 2.3MB build, and are
        // cached as they are used instead of on install.
        globPatterns: ['**/*.{js,css,html}'],
        // Not this app's worker — see public/service-worker.js.
        globIgnores: ['service-worker.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        // /api is the Worker's, not ours. A navigation fallback here would answer a failed
        // API call with the app's HTML, and caching one would serve a stale score.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/auth/, ''),
        // heimdall scopes the refresh_token cookie to Path=/v1/refresh, which is
        // heimdall-relative and doesn't match the proxied /api/auth/v1/refresh path,
        // so the browser would never send it back. Rewrite Set-Cookie Path to match.
        cookiePathRewrite: { '/v1/refresh': '/api/auth/v1/refresh', '/': '/api/auth' },
      },
      '/api/scorecard': { target: 'http://localhost:5000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/scorecard/, '') },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
