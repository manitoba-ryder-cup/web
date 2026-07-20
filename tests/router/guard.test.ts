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

// No app route sets requiresAuth yet (all reads are public), so register a synthetic
// protected route to exercise the guard itself — it's infrastructure for future admin pages.
router.addRoute({
  path: '/__protected',
  name: 'protected',
  meta: { requiresAuth: true },
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
})
