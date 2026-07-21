/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
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
  },
})
