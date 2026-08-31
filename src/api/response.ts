import { ApiError } from './types'
import { FALLBACK } from '@/lib/displayError'

// Only the API's error envelope is copy for a reader. A status line and an unparseable body are
// both written by whoever answered, and neither is a sentence meant for one.
async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  try {
    const parsed = JSON.parse(body)
    if (typeof parsed?.error === 'string' && parsed.error) return parsed.error
  } catch {
    // Not the envelope.
  }
  return FALLBACK
}

// Every response the app reads arrives through here, so a failure is the same ApiError
// whichever path produced it.
export async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    // An interception wearing a success code, so it fails like one rather than as a SyntaxError
    // naming the first character of somebody else's markup.
    throw new ApiError(res.status, FALLBACK)
  }
}
