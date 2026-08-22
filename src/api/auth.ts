import type { LoginRequest, LoginResponse, User } from './types'
import { parseResponse } from './response'
import { fetchWithTimeout } from './timeout'

const BASE = '/api/auth'

// Not through ApiClient: it refreshes and retries on a 401, which every call here has to
// avoid — a refused login has no session to refresh, and refresh would recurse into itself.
export const authApi = {
  login: (body: LoginRequest) =>
    fetchWithTimeout(`${BASE}/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(parseResponse<LoginResponse>),
  refresh: () => fetchWithTimeout(`${BASE}/v1/refresh`, { method: 'POST' }).then(parseResponse<LoginResponse>),
  logout: () => fetchWithTimeout(`${BASE}/v1/logout`, { method: 'POST' }),
  me: (token: string) =>
    fetchWithTimeout(`${BASE}/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(parseResponse<User>),
}
