import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { ApiError, type User } from '@/api/types'
import { scopesFrom } from '@/lib/token'

// 401 is the only answer that means the session is over — expired, revoked, or spent. A
// timeout or a dropped connection says nothing about whether it is still there.
function sessionEnded(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401
}

// A home-screen app launches into whatever network the phone has a second after waking, which
// is often none. The cookie outlives the access token by a day, so there is time to wait.
const RETRY_DELAYS = [1_000, 3_000, 10_000]

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => accessToken.value !== null)
  // Read off the token rather than stored separately, so a refresh that narrows a user's
  // access narrows what they are offered on the next request rather than at next login.
  const scopes = computed(() => scopesFrom(accessToken.value))
  const hasScope = (scope: string) => scopes.value.includes(scope)
  // Not refs: nothing renders these, and callers join or compare rather than read.
  let rotating: Promise<void> | null = null
  let resuming: Promise<void> | null = null
  // A lookup that never got an answer, as against one that was refused. Only the first is worth
  // asking again — and nothing else will, since anonymous reads never raise a 401 to ride on.
  let unanswered = false
  // Signing in, signing out and being refused each decide the session on purpose and start a
  // new epoch. Work already in flight belongs to the one before it and must not write over it.
  let epoch = 0

  function clear() {
    epoch += 1
    accessToken.value = null
    user.value = null
    unanswered = false
  }

  async function login(email: string, password: string) {
    // Fetch token + user before assigning either, so a me() failure never
    // leaves a half-authenticated state (token set, user null).
    const res = await authApi.login({ email, password })
    const loggedInUser = await authApi.me(res.access_token)
    epoch += 1
    accessToken.value = res.access_token
    user.value = loggedInUser
    unanswered = false
  }

  async function rotate() {
    const mine = epoch
    try {
      const res = await authApi.refresh()
      if (epoch === mine) accessToken.value = res.access_token
    } catch (err) {
      // Only a refusal ends a session, and only the session it was asked about: someone who
      // signed in while this was in flight owns the one that exists now.
      if (epoch === mine && sessionEnded(err)) clear()
      throw err
    }
  }

  // Every caller joins one rotation: the cookie is single-use, and a spent value presented
  // again reads as theft outside the brief grace heimdall allows the client it was issued to.
  function refresh(): Promise<void> {
    rotating ??= rotate().finally(() => {
      rotating = null
    })
    return rotating
  }

  async function loadSession() {
    const mine = epoch
    await refresh()
    if (epoch !== mine || !accessToken.value) return
    const loaded = await authApi.me(accessToken.value)
    if (epoch === mine) user.value = loaded
  }

  async function restore() {
    try {
      await loadSession()
      unanswered = false
    } catch (err) {
      if (sessionEnded(err)) return clear()
      unanswered = true
      // Not awaited: the app mounts on the first attempt, and a session that arrives ten
      // seconds later still beats a login form.
      void retryRestore()
    }
  }

  // Asked again when the network may be back: the cookie outlives the access token by a day, so
  // a phone that failed to ask should not sit signed out holding a session that never ended.
  function resume(): Promise<void> {
    if (!unanswered || accessToken.value) return Promise.resolve()
    resuming ??= restore().finally(() => {
      resuming = null
    })
    return resuming
  }

  async function retryRestore() {
    const mine = epoch
    for (const delay of RETRY_DELAYS) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      // Anyone who signed in or out while these were pending has the last word, and a retry
      // from before that is answering a question nobody is asking any more.
      if (epoch !== mine) return
      try {
        await loadSession()
        unanswered = false
        return
      } catch (err) {
        if (sessionEnded(err)) return
      }
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clear()
    }
  }

  return { accessToken, user, isAuthenticated, scopes, hasScope, login, refresh, restore, resume, logout }
})
