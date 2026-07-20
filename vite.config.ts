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
    port: 5173,
    proxy: {
      '/api/auth': { target: 'http://localhost:8080', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/auth/, '') },
      '/api/scorecard': { target: 'http://localhost:5000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/scorecard/, '') },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
