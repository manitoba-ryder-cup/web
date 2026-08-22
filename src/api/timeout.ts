import { ApiError } from './types'

// A request that never settles is worse than one that fails. The view keeps its skeleton,
// the Try again button never appears, and on a phone in a field the only way out is a
// reload — which is the one thing "one tap from recovering" is written against. The browser
// gives up eventually, but on its own schedule, measured in minutes.
//
// Fifteen seconds is far outside anything this API does when it is working: warm requests
// answer in well under a second and a Cloud Run cold start was measured at about two. So a
// request that reaches the deadline was not going to arrive.
//
// It is a client-side verdict, not the server's, and for a write that is a real limit: a
// create that lands at sixteen seconds is aborted here and the admin is told it failed, so
// tapping again can make a second one. The hole write replaces a hole's scores rather than
// adding to them and is safe to repeat; `createMatch`, `draftPlayer` and `addParticipant`
// are not. Only the server can close that, by taking a key that makes a repeat a no-op.
const TIMEOUT_MS = 15_000

const NO_BODY = new Set([204, 205, 304])

export async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  // A controller and a timer of our own rather than AbortSignal.timeout: the signal it
  // returns is driven by a timer inside the platform, which cannot be advanced from a test.
  const controller = new AbortController()
  // Tracked separately from `controller.signal.aborted`, which is also true when a caller
  // aborted through their own signal — their cancellation is not this deadline expiring.
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)

  // A caller's signal still cancels: taking one and dropping it would hand the first
  // component that wants cancel-on-unmount a request that quietly never cancels.
  const caller = init.signal
  if (caller?.aborted) controller.abort(caller.reason)
  else caller?.addEventListener('abort', () => controller.abort(caller.reason), { once: true })

  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    // The body is read here, inside the deadline. fetch resolves as soon as the headers
    // arrive, so leaving it to the caller left the read unbounded — a connection that
    // stalls after the status line is exactly the weak-signal case this exists for.
    let body: string | null = null
    if (!NO_BODY.has(res.status)) {
      try {
        body = await res.text()
      } catch (err) {
        // Falling back to an empty body is only ever right for a response that already
        // failed: an unreadable 502 still has to reach the view as a 502. On a 200 it would
        // invent a success — a connection dropping mid-body would arrive as an empty list
        // and render "No tournaments yet." instead of an error with Try again. An abort,
        // ours or the caller's, is not a body problem at all and belongs to whoever asked.
        if (res.ok || controller.signal.aborted) throw err
        body = ''
      }
    }
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers })
  } catch (err) {
    // 408 is this app's verdict, not the server's — but it keeps the failure an ApiError,
    // so every caller that reads `status` or shows `message` behaves as it already does.
    // Raw, this reaches the user as "signal is aborted without reason".
    if (timedOut) throw new ApiError(408, 'The server took too long to answer. Please try again.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// Whether a failed query is worth another go. One retry covers a blip; a request that
// already waited out the deadline above has had its time, and retrying it spends a second
// fifteen seconds before the view can offer Try again — which is what bounding it was for.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status === 408) return false
  return failureCount < 1
}
