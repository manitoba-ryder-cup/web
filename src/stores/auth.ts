import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => accessToken.value !== null)

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    accessToken.value = res.access_token
    user.value = await authApi.me(res.access_token)
  }

  async function refresh() {
    const res = await authApi.refresh()
    accessToken.value = res.access_token
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
    try { await authApi.logout() } finally {
      accessToken.value = null
      user.value = null
    }
  }

  return { accessToken, user, isAuthenticated, login, refresh, restore, logout }
})
