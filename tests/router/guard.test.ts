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

describe('router guard', () => {
  beforeEach(async () => {
    // Fresh pinia per test so the auth store starts unauthenticated (default state);
    // router is a singleton, so reset its position before each navigation assertion.
    setActivePinia(createPinia())
    await router.replace('/')
  })

  it('redirects an unauthenticated user away from a requiresAuth route to login', async () => {
    await router.push('/dashboard')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })
})
