import { ApiError } from './types'

// The API answers errors as {"error": "..."}; anything in front of it (a proxy, a
// gateway, a phone that lost signal mid-response) may answer with plain text or nothing
// at all. Never resolve to an empty string: an ApiError with no message reads as "no
// error" to every caller that checks truthiness, so a 502 would render as an empty page.
async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  try {
    const parsed = JSON.parse(body)
    if (typeof parsed?.error === 'string' && parsed.error) return parsed.error
  } catch {
    // Not JSON — fall through and use the body as-is.
  }
  return body.trim() || res.statusText || `Request failed (${res.status})`
}

type TokenGetter = () => string | null
type Refresher = () => Promise<void>

export class ApiClient {
  // Explicit fields + assignment (not constructor parameter properties): this
  // project's tsconfig sets erasableSyntaxOnly, which disallows that shorthand.
  private base: string
  private getToken: TokenGetter
  private refresh: Refresher

  constructor(base: string, getToken: TokenGetter, refresh: Refresher) {
    this.base = base
    this.getToken = getToken
    this.refresh = refresh
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }
  del<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    // Refresh-and-retry exactly once: `retried` prevents a refresh loop if the
    // retried request itself comes back 401 (stale/expired refresh cookie).
    if (res.status === 401 && !retried) {
      await this.refresh()
      return this.request<T>(method, path, body, true)
    }
    if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
    if (res.status === 204) return undefined as T
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
}
