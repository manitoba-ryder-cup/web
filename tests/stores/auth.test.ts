import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/auth', () => ({
  authApi: { login: vi.fn(), refresh: vi.fn(), logout: vi.fn(), me: vi.fn() },
}))

const LOGGED_IN = { access_token: 'acc-1', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 3600 }
const REFRESHED = { access_token: 'acc-2', token_type: 'Bearer', expires_in: 900, refresh_expires_in: 3600 }
const ME = { id: 'u1', email: 'dev@x.com', first_name: 'Dev', last_name: 'User' }

import { useAuthStore } from '@/stores/auth'
import { ApiError, type LoginResponse, type User } from '@/api/types'
import { authApi } from '@/api/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // mockReset rather than clearAllMocks, which leaves the ...Once queues intact: a rejection
    // a failing test never consumed is handed to the next one, and one failure becomes five.
    vi.mocked(authApi.login).mockReset().mockResolvedValue(LOGGED_IN)
    vi.mocked(authApi.refresh).mockReset().mockResolvedValue(REFRESHED)
    vi.mocked(authApi.logout)
      .mockReset()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.mocked(authApi.me).mockReset().mockResolvedValue(ME)
  })

  // Not inline in the tests that install them: a failing assertion throws first, and fake
  // timers left on leak into every test after it.
  afterEach(() => vi.useRealTimers())

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

  it('restore stays logged out when the session is refused', async () => {
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(401, 'invalid refresh token'))
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.isAuthenticated).toBe(false)
    expect(authApi.refresh).toHaveBeenCalledOnce()
  })

  it('restore keeps trying when the network fails rather than the session', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'The server took too long to answer.'))
    const auth = useAuthStore()
    await auth.restore()
    // Mounts on the first attempt: a waking phone must not be made to wait for a retry.
    expect(auth.isAuthenticated).toBe(false)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('u1')
  })

  it('restore stops retrying once someone has signed in by hand', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()
    await auth.login('dev@x.com', 'pw')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(auth.accessToken).toBe('acc-1')
    // The one that failed, and nothing after it: the pending retries found a session.
    expect(authApi.refresh).toHaveBeenCalledOnce()
  })

  it('restore gives up retrying once the session is refused', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh)
      .mockRejectedValueOnce(new ApiError(408, 'timeout'))
      .mockRejectedValueOnce(new ApiError(401, 'invalid refresh token'))
    const auth = useAuthStore()
    await auth.restore()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(auth.isAuthenticated).toBe(false)
    // Two: the timeout, then the refusal. It must not work through the whole schedule.
    expect(authApi.refresh).toHaveBeenCalledTimes(2)
  })

  // The retries cover the first fourteen seconds and then stop. Nothing else ever asks: reads
  // are served anonymously, so no 401 is raised and the lazy refresh has nothing to fire on.
  it('resumes a lookup that never got an answer', async () => {
    vi.useFakeTimers()
    const offline = new ApiError(408, 'The server took too long to answer.')
    vi.mocked(authApi.refresh).mockRejectedValue(offline)
    const auth = useAuthStore()
    await auth.restore()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(auth.isAuthenticated).toBe(false)

    vi.mocked(authApi.refresh).mockResolvedValue(REFRESHED)
    await auth.resume()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe('u1')
  })

  // A refusal is an answer. Asking again spends a request on a session that is over, once per
  // tab focus for as long as the app is open.
  it('does not resume a session the server refused', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiError(401, 'Session expired'))
    const auth = useAuthStore()
    await auth.restore()
    vi.mocked(authApi.refresh).mockClear()

    await auth.resume()

    expect(authApi.refresh).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('does not resume after signing out', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    await auth.logout()
    vi.mocked(authApi.refresh).mockClear()

    await auth.resume()

    expect(authApi.refresh).not.toHaveBeenCalled()
  })

  it('does not resume a session it already has', async () => {
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.isAuthenticated).toBe(true)
    vi.mocked(authApi.refresh).mockClear()

    await auth.resume()

    expect(authApi.refresh).not.toHaveBeenCalled()
  })

  // Showing a tab fires the event repeatedly. The rotation joins on its own; what stacks
  // without this is what sits on top of it — a user load each, and a retry loop each.
  it('answers repeated resumes with one lookup', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()
    await vi.advanceTimersByTimeAsync(20_000)

    // Cleared first: the failed lookup and its three retries are already on the counter.
    vi.mocked(authApi.refresh).mockClear()
    let release: (v: LoginResponse) => void = () => {}
    vi.mocked(authApi.refresh).mockReturnValue(new Promise<LoginResponse>((r) => (release = r)))
    const both = Promise.all([auth.resume(), auth.resume()])
    release(REFRESHED)
    await both

    expect(authApi.refresh).toHaveBeenCalledTimes(1)
    expect(authApi.me).toHaveBeenCalledTimes(1)
  })

  it('logout clears state', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    await auth.logout()
    expect(auth.accessToken).toBeNull()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('a refused refresh clears auth state and rethrows', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(401, 'invalid refresh token'))
    await expect(auth.refresh()).rejects.toThrow('invalid refresh token')
    expect(auth.accessToken).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('a refresh that times out keeps the session and rethrows', async () => {
    const auth = useAuthStore()
    await auth.login('dev@x.com', 'pw')
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'The server took too long to answer.'))
    await expect(auth.refresh()).rejects.toThrow('too long')
    expect(auth.accessToken).toBe('acc-1')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('concurrent callers share one rotation', async () => {
    const auth = useAuthStore()
    // What returning to the app does: every mounted query refetches, each one 401s, and each
    // asks for a refresh. The cookie is single-use, so a second rotation ends the session.
    await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()])
    expect(authApi.refresh).toHaveBeenCalledOnce()
    expect(auth.accessToken).toBe('acc-2')
  })

  it('a later refresh rotates again rather than reusing the joined one', async () => {
    const auth = useAuthStore()
    await auth.refresh()
    await auth.refresh()
    expect(authApi.refresh).toHaveBeenCalledTimes(2)
  })

  // Everything below is the same race: a retry whose refresh is already in flight when the user
  // decides the session by hand. Each was reported on the branch.

  it('a retry refused after someone signs in leaves the new session alone', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()

    let refuse: (err: unknown) => void = () => {}
    vi.mocked(authApi.refresh).mockImplementationOnce(() => new Promise((_, reject) => (refuse = reject)))
    await vi.advanceTimersByTimeAsync(1_000)

    await auth.login('dev@x.com', 'pw')
    // The login rotated the family, so the in-flight retry is refused on a cookie it no longer owns.
    refuse(new ApiError(401, 'invalid refresh token'))
    await vi.advanceTimersByTimeAsync(0)

    expect(auth.accessToken).toBe('acc-1')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('a retry that lands after someone signs in does not replace them', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.me).mockImplementation(async (token: string) => (token === 'acc-1' ? ME : { ...ME, id: 'u2' }))
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()

    let land: (value: LoginResponse) => void = () => {}
    vi.mocked(authApi.refresh).mockImplementationOnce(() => new Promise((resolve) => (land = resolve)))
    await vi.advanceTimersByTimeAsync(1_000)

    await auth.login('dev@x.com', 'pw')
    land(REFRESHED)
    await vi.advanceTimersByTimeAsync(0)

    expect(auth.accessToken).toBe('acc-1')
    expect(auth.user?.id).toBe('u1')
    // The login's, and none for the retry: once the epoch has moved there is nobody to load.
    expect(authApi.me).toHaveBeenCalledOnce()
  })

  it('a user loaded after someone signs in does not replace them', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()

    // The retry gets past its refresh and stalls loading the user, which is the later window:
    // the token guard has already been cleared by the time the login lands.
    let land: (loaded: User) => void = () => {}
    vi.mocked(authApi.me).mockImplementation(async (token: string) => (token === 'acc-1' ? ME : new Promise((resolve) => (land = resolve))))
    await vi.advanceTimersByTimeAsync(1_000)

    await auth.login('dev@x.com', 'pw')
    land({ ...ME, id: 'u2' })
    await vi.advanceTimersByTimeAsync(0)

    expect(auth.user?.id).toBe('u1')
    expect(auth.accessToken).toBe('acc-1')
  })

  it('a transport failure loading the user heals rather than sticking half signed in', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.user).toBeNull()

    await vi.advanceTimersByTimeAsync(1_000)
    expect(auth.user?.id).toBe('u1')
  })

  it('logging out of a half-loaded session stops the retries', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()
    // A token, no profile, and Logout on screen — which renders on isAuthenticated alone.
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user).toBeNull()

    await auth.logout()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(auth.isAuthenticated).toBe(false)
    // Restore's own refresh and nothing after it. No login intervened, so signing out is the
    // only thing that can have stopped the pending retry.
    expect(authApi.refresh).toHaveBeenCalledOnce()
  })

  it('logging out stops the retries still pending', async () => {
    vi.useFakeTimers()
    vi.mocked(authApi.refresh).mockRejectedValueOnce(new ApiError(408, 'timeout'))
    const auth = useAuthStore()
    await auth.restore()
    await auth.login('dev@x.com', 'pw')
    await auth.logout()

    await vi.advanceTimersByTimeAsync(20_000)
    expect(auth.isAuthenticated).toBe(false)
    // The failed first attempt and nothing since: a signed-out user must not be signed back in.
    expect(authApi.refresh).toHaveBeenCalledOnce()
  })

  it('login failure at me() leaves logged out', async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(new Error('me failed'))
    const auth = useAuthStore()
    await expect(auth.login('dev@x.com', 'pw')).rejects.toThrow('me failed')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.accessToken).toBeNull()
  })
})
