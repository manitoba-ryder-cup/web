import { ApiError } from './types'

// Never an empty string: an ApiError with no message reads as no error to anything checking
// truthiness, so a 502 would render as an empty page.
function statusMessage(res: Response): string {
  return res.statusText || `Request failed (${res.status})`
}

// Only the API's own JSON sentence is copy for a reader. A body that will not parse came from
// something in between — a proxy, a filter, a captive portal — and its page is not ours to show.
async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  try {
    const parsed = JSON.parse(body)
    if (typeof parsed?.error === 'string' && parsed.error) return parsed.error
  } catch {
    // Not JSON, so not the API talking.
  }
  return statusMessage(res)
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
    // The same interception wearing a success code, so it fails like one rather than as a
    // SyntaxError naming the first character of somebody else's markup.
    throw new ApiError(res.status, 'The server sent a response this app could not read.')
  }
}
