import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Some detail routes declare a contextual back link. The app header renders it (replacing
// the wordmark) purely from the current route's meta, so it never lingers across a
// navigation — there's no per-component lifecycle to race.
declare module 'vue-router' {
  interface RouteMeta {
    back?: (route: RouteLocationNormalizedLoaded) => { to: RouteLocationRaw; label: string }
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/news', name: 'news', component: () => import('@/views/NewsView.vue') },
    { path: '/tournaments', name: 'tournaments', component: () => import('@/views/TournamentsView.vue') },
    { path: '/tournaments/:id', name: 'tournament', component: () => import('@/views/TournamentView.vue'), props: true },
    {
      path: '/tournaments/:tournamentId/matches/:matchId',
      name: 'match',
      component: () => import('@/views/MatchDetailView.vue'),
      props: true,
      meta: { back: (r) => ({ to: { name: 'tournament', params: { id: r.params.tournamentId } }, label: 'Leaderboard' }) },
    },
    {
      path: '/tournaments/:tournamentId/matches/:matchId/holes/:hole',
      name: 'hole',
      component: () => import('@/views/HoleEntryView.vue'),
      props: true,
      meta: {
        back: (r) => ({
          to: { name: 'match', params: { tournamentId: r.params.tournamentId, matchId: r.params.matchId } },
          label: 'Scorecard',
        }),
      },
    },
    { path: '/players', name: 'players', component: () => import('@/views/PlayersView.vue') },
    {
      path: '/players/:id',
      name: 'player',
      component: () => import('@/views/PlayerView.vue'),
      props: true,
      meta: { back: () => ({ to: { name: 'players' }, label: 'Players' }) },
    },
    {
      // The per-cup page is gone — a player's cups open in place on their profile instead.
      // Kept as a redirect because this URL was shareable and is what the roster linked to,
      // and the hash lands on the same cup the old page showed.
      path: '/players/:id/tournaments/:tournamentId',
      redirect: (to) => ({ name: 'player', params: { id: to.params.id }, hash: `#${to.params.tournamentId}` }),
    },
    // Admin area — assigning players to teams and matches. Gated behind login; the
    // write endpoints additionally require the tournaments:write scope on the token.
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/tournaments/:id',
      name: 'admin-tournament',
      component: () => import('@/views/admin/AdminTournamentView.vue'),
      props: true,
      meta: { requiresAuth: true, back: () => ({ to: { name: 'admin' }, label: 'Admin' }) },
    },
    {
      path: '/admin/tournaments/:id/teams',
      name: 'admin-teams',
      component: () => import('@/views/admin/AdminTeamsView.vue'),
      props: true,
      meta: { requiresAuth: true, back: (r) => ({ to: { name: 'admin-tournament', params: { id: r.params.id } }, label: 'Setup' }) },
    },
    {
      path: '/admin/tournaments/:id/matches/:matchId',
      name: 'admin-lineup',
      component: () => import('@/views/admin/AdminMatchLineupView.vue'),
      props: true,
      meta: { requiresAuth: true, back: (r) => ({ to: { name: 'admin-tournament', params: { id: r.params.id } }, label: 'Setup' }) },
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { back: () => ({ to: { name: 'login' }, label: 'Login' }) },
    },
  ],
})

router.beforeEach((to) => {
  // Referenced inside the guard (not at module scope) so Pinia is active when this runs.
  // The /admin/* routes set requiresAuth; public reads stay open to everyone.
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
