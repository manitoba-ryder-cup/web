import type { LoginRequest, LoginResponse, User } from './types'

const BASE = '/api/auth'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`auth ${res.status}`)
  return res.json() as Promise<T>
}

// These calls are made without the client wrapper: login has no token yet, and
// refresh must not itself trigger the refresh interceptor.
export const authApi = {
  login: (body: LoginRequest) =>
    fetch(`${BASE}/v1/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(json<LoginResponse>),
  refresh: () =>
    fetch(`${BASE}/v1/refresh`, { method: 'POST' }).then(json<LoginResponse>),
  logout: () => fetch(`${BASE}/v1/logout`, { method: 'POST' }),
  me: (token: string) =>
    fetch(`${BASE}/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(json<User>),
}
