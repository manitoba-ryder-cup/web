import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User } from '@/api/types'
import { scopesFrom } from '@/lib/token'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => accessToken.value !== null)
  // Read off the token rather than stored separately, so a refresh that narrows a user's
  // access narrows what they are offered on the next request rather than at next login.
  const scopes = computed(() => scopesFrom(accessToken.value))
  const hasScope = (scope: string) => scopes.value.includes(scope)

  async function login(email: string, password: string) {
    // Fetch token + user before assigning either, so a me() failure never
    // leaves a half-authenticated state (token set, user null).
    const res = await authApi.login({ email, password })
    const loggedInUser = await authApi.me(res.access_token)
    accessToken.value = res.access_token
    user.value = loggedInUser
  }

  async function refresh() {
    try {
      const res = await authApi.refresh()
      accessToken.value = res.access_token
    } catch (err) {
      // Rethrow after clearing so ApiClient's uncaught 401 interceptor doesn't
      // leave the app stuck "authenticated" with a token that will never work.
      accessToken.value = null
      user.value = null
      throw err
    }
  }

  async function restore() {
    try {
      await refresh()
      if (accessToken.value) user.value = await authApi.me(accessToken.value)
    } catch {
      accessToken.value = null
      user.value = null
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      accessToken.value = null
      user.value = null
    }
  }

  return { accessToken, user, isAuthenticated, scopes, hasScope, login, refresh, restore, logout }
})
