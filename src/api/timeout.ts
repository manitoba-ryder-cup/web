import { ApiError } from './types'

// eslint-disable-next-line comment-cap/max-lines -- names the writes this cannot make safe,
// which is the limit of the whole approach and not visible from the code.
// A request that never settles is worse than one that fails: the view keeps its skeleton and
// the Try again never appears, while the browser gives up on its own schedule, in minutes.
// Fifteen seconds is far outside anything this API does working — a cold start measured about
// two. It is this app's verdict, not the server's, so a write cut off here may still have
// landed: the hole write replaces a hole's scores and is safe to repeat, `createMatch`,
// `draftPlayer` and `addParticipant` are not. Only the server can close that.
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
    // Inside the deadline: fetch resolves as soon as the headers arrive, so leaving the body to
    // the caller left the read unbounded — the same stall one step later.
    let body: string | null = null
    if (!NO_BODY.has(res.status)) {
      try {
        body = await res.text()
      } catch (err) {
        // Only right for a response that already failed: on a 200 it invents a success, and a
        // connection dropping mid-body arrives as an empty list rendering "nothing here yet".
        if (res.ok || controller.signal.aborted) throw err
        body = ''
      }
    }
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers })
  } catch (err) {
    // An ApiError, so every caller reading `status` behaves as it already does. Raw, this reaches
    // the user as "signal is aborted without reason".
    if (timedOut) throw new ApiError(408, 'The server took too long to answer. Please try again.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// One retry covers a blip. A request that already waited out the deadline has had its time,
// and retrying spends a second fifteen seconds in front of the Try again.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status === 408) return false
  return failureCount < 1
}
