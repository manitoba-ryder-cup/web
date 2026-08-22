import { ApiError } from './types'

// Never an empty string: an ApiError with no message reads as no error to anything checking
// truthiness, so a 502 would render as an empty page.
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

// Every response the app reads arrives through here, so a failure is the same ApiError
// whichever path produced it.
export async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
