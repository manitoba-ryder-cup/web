import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { reloadOnceForStaleChunk } from './lib/staleChunk'
import { registerSW } from 'virtual:pwa-register'

// A lazily imported route whose chunk the latest deploy replaced fails to load; without
// this the user is left on a dead route with nothing to act on.
window.addEventListener('vite:preloadError', () => {
  reloadOnceForStaleChunk(sessionStorage, () => window.location.reload())
})

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())

// Restore the session (refresh cookie) before the first navigation so guards see
// a resolved auth state, then mount.
const auth = useAuthStore()
auth.restore().finally(() => {
  app.use(router)
  app.mount('#app')
})
