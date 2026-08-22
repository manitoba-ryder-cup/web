import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { reloadOnceForStaleChunk } from './lib/staleChunk'
import { registerSW } from 'virtual:pwa-register'
import { shouldRetry } from './api/timeout'

// A lazily imported route whose chunk the latest deploy replaced fails to load; without
// this the user is left on a dead route with nothing to act on.
window.addEventListener('vite:preloadError', () => {
  reloadOnceForStaleChunk(sessionStorage, () => window.location.reload())
})

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, {
  queryClient: new QueryClient({
    defaultOptions: {
      queries: {
        // Serve what we have at once, then check anyway. 30s is long enough that tapping
        // between tabs is free and short enough that the draft never sits stale for long.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // One, and none for a request that already waited out its own deadline: retrying
        // that spends a second fifteen seconds before the view can offer Try again, which
        // is the opposite of what bounding the request was for. Anything else gets the one
        // retry a blip deserves — the default of three puts ~7s of backoff behind the
        // skeleton, and a save on the hole page waits on this refresh too.
        retry: shouldRetry,
      },
    },
  }),
})

// Restore the session (refresh cookie) before the first navigation so guards see
// a resolved auth state, then mount.
const auth = useAuthStore()
auth.restore().finally(() => {
  app.use(router)
  app.mount('#app')
})
