import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

// Some detail routes declare a contextual back link. The app header renders it (replacing
// the wordmark) purely from the current route's meta, so it never lingers across a
// navigation — there's no per-component lifecycle to race.
declare module 'vue-router' {
  interface RouteMeta {
    back?: (route: RouteLocationNormalizedLoaded) => { to: RouteLocationRaw; label: string }
    // Hides the bottom nav. Score entry is a full-height control and the bar would sit
    // under the thumb that works it.
    hidesNav?: boolean
    // A scope the token must carry. Authentication alone is not enough for the admin
    // area: a scorer holds a write scope and still has no business in tournament setup.
    requiresScope?: string
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/tournaments', name: 'tournaments', component: () => import('@/views/TournamentsView.vue') },
    { path: '/tournaments/:id', name: 'tournament', component: () => import('@/views/TournamentView.vue'), props: true },
    {
      path: '/tournaments/:tournamentId/matches/:matchId',
      name: 'match',
      component: () => import('@/views/MatchDetailView.vue'),
      props: true,
      meta: { back: (r) => ({ to: { name: 'tournament', params: { id: r.params.tournamentId } }, label: 'Scores' }) },
    },
    {
      path: '/tournaments/:tournamentId/matches/:matchId/holes/:hole',
      name: 'hole',
      component: () => import('@/views/HoleEntryView.vue'),
      props: true,
      meta: {
        hidesNav: true,
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
      // A profile is reached from this year's roster and from the history page's
      // participants, so the back link reads the `from` its card put in the URL. Route in,
      // link out: a refresh or a shared link answers the same as the tap did.
      meta: {
        back: (r) =>
          r.query.from === 'history'
            ? { to: { name: 'tournaments', hash: '#participants' }, label: 'History' }
            : { to: { name: 'players' }, label: 'Players' },
      },
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
      meta: { requiresScope: SCOPE_TOURNAMENTS_WRITE },
    },
    {
      path: '/admin/tournaments/:id',
      name: 'admin-tournament',
      component: () => import('@/views/admin/AdminTournamentView.vue'),
      props: true,
      meta: { requiresScope: SCOPE_TOURNAMENTS_WRITE, back: () => ({ to: { name: 'admin' }, label: 'Admin' }) },
    },
    {
      path: '/admin/tournaments/:id/players',
      name: 'admin-roster',
      component: () => import('@/views/admin/AdminRosterView.vue'),
      props: true,
      meta: {
        requiresScope: SCOPE_TOURNAMENTS_WRITE,
        back: (r) => ({ to: { name: 'admin-tournament', params: { id: r.params.id } }, label: 'Setup' }),
      },
    },
    {
      path: '/admin/tournaments/:id/teams',
      name: 'admin-teams',
      component: () => import('@/views/admin/AdminTeamsView.vue'),
      props: true,
      meta: {
        requiresScope: SCOPE_TOURNAMENTS_WRITE,
        back: (r) => ({ to: { name: 'admin-tournament', params: { id: r.params.id } }, label: 'Setup' }),
      },
    },
    {
      path: '/admin/tournaments/:id/matches/:matchId',
      name: 'admin-lineup',
      component: () => import('@/views/admin/AdminMatchLineupView.vue'),
      props: true,
      meta: {
        requiresScope: SCOPE_TOURNAMENTS_WRITE,
        back: (r) => ({ to: { name: 'admin-tournament', params: { id: r.params.id } }, label: 'Setup' }),
      },
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
  const auth = useAuthStore()

  // A scope is only ever held by someone signed in, so requiring one requires a session.
  // Deriving it means a route cannot ask for a scope and forget to ask for the login,
  // which would send an anonymous visitor to the dashboard with no way forward.
  if ((to.meta.requiresAuth || to.meta.requiresScope) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // Signed in and still not allowed: back to login would loop, since signing in again
  // grants nothing new.
  if (to.meta.requiresScope && !auth.hasScope(to.meta.requiresScope)) {
    return { name: 'dashboard' }
  }
})

export default router
