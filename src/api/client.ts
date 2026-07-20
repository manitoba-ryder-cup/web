import { ApiError } from './types'

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

  get<T>(path: string): Promise<T> { return this.request<T>('GET', path) }
  post<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('POST', path, body) }

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
    if (!res.ok) throw new ApiError(res.status, await res.text())
    if (res.status === 204) return undefined as T
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
}
