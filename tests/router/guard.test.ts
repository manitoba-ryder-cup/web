import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mocked so store construction / any accidental restore() call never hits the network.
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error('no cookie')),
    logout: vi.fn(),
    me: vi.fn(),
  },
}))

import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_TOURNAMENTS_WRITE, SCOPE_SCORES_WRITE } from '@/api/scopes'
import { tokenWithScopes } from '../support/token'

// A synthetic route so the guard is exercised without depending on which real routes
// happen to be protected. The /admin/* routes carry both these meta fields.
router.addRoute({
  path: '/__protected',
  name: 'protected',
  meta: { requiresAuth: true },
  component: { template: '<div/>' },
})
router.addRoute({
  path: '/__scoped',
  name: 'scoped',
  meta: { requiresScope: SCOPE_TOURNAMENTS_WRITE },
  component: { template: '<div/>' },
})

describe('router guard', () => {
  beforeEach(async () => {
    // Fresh pinia per test so the auth store starts unauthenticated (default state);
    // router is a singleton, so reset its position before each navigation assertion.
    setActivePinia(createPinia())
    await router.replace('/')
  })

  it('redirects an unauthenticated user away from a requiresAuth route to login', async () => {
    await router.push('/__protected')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/__protected')
  })

  // The real /admin routes name a scope and nothing else, so an anonymous visitor has to
  // reach login through the scope requirement alone — landing on the dashboard would
  // leave them with no way in.
  it('sends an anonymous visitor to login from a scope-only route', async () => {
    await router.push('/__scoped')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/__scoped')
  })

  // A scorer is signed in and holds a write scope, and still has no business in tournament
  // setup. Authentication was the only gate before, so the admin area was open to them.
  it('turns away a signed-in user whose token lacks the scope', async () => {
    const auth = useAuthStore()
    auth.accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])

    await router.push('/__scoped')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('lets through a user whose token carries it', async () => {
    const auth = useAuthStore()
    auth.accessToken = tokenWithScopes([SCOPE_TOURNAMENTS_WRITE])

    await router.push('/__scoped')
    expect(router.currentRoute.value.name).toBe('scoped')
  })
})
