import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'news', component: () => import('@/views/NewsView.vue') },
    { path: '/tournaments', name: 'tournaments', component: () => import('@/views/TournamentsView.vue') },
    { path: '/tournaments/:id', name: 'tournament', component: () => import('@/views/TournamentView.vue'), props: true },
    { path: '/players', name: 'players', component: () => import('@/views/PlayersView.vue') },
    { path: '/players/:id', name: 'player', component: () => import('@/views/PlayerView.vue'), props: true },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  ],
})

router.beforeEach((to) => {
  // Referenced inside the guard (not at module scope) so Pinia is active when this runs.
  // No route sets requiresAuth yet (all reads are public); the guard remains as
  // infrastructure for future admin/write pages.
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
