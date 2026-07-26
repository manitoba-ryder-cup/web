import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({ access_token: 'acc-1', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 3600 }),
    refresh: vi.fn().mockResolvedValue({ access_token: 'acc-2', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 3600 }),
    logout: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    me: vi.fn().mockResolvedValue({ id: 'u1', email: 'dev@x.com', first_name: 'Dev', last_name: 'User' }),
  },
}))

import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

describe('auth store', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('login stores token + user and marks authenticated', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    expect(auth.accessToken).toBe('acc-1')
    expect(auth.user?.email).toBe('dev@x.com')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('restore refreshes and hydrates the user', async () => {
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.accessToken).toBe('acc-2')
    expect(auth.user?.id).toBe('u1')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('restore stays logged out when refresh fails', async () => {
    ;vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error('no cookie'))
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout clears state', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    await auth.logout()
    expect(auth.accessToken).toBeNull()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('refresh failure clears auth state and rethrows', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    ;vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error('no cookie'))
    await expect(auth.refresh()).rejects.toThrow('no cookie')
    expect(auth.accessToken).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('login failure at me() leaves logged out', async () => {
    ;vi.mocked(authApi.me).mockRejectedValueOnce(new Error('me failed'))
    const auth = useAuthStore()
    await expect(auth.login('dev@x.com', 'pw')).rejects.toThrow('me failed')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.accessToken).toBeNull()
  })
})
