import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithTimeout, shouldRetry } from '@/api/timeout'
import { ApiError } from '@/api/types'

describe('fetchWithTimeout', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.useRealTimers())

  it('passes an abort signal to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchWithTimeout('/api/scorecard/v1/tournaments')

    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })

  // The failure this exists for: a request that never settles leaves the view on its
  // skeleton with no Try again, and the browser's own patience runs to minutes.
  it('gives up on a request that never settles, as an ApiError a view can render', async () => {
    vi.useFakeTimers()
    // Honour the signal the way the platform does, and otherwise never resolve.
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject((init.signal as AbortSignal).reason))
        }),
    )

    // Caught as it is created, not after the clock is advanced: the rejection lands while
    // the timers run, and a promise that rejects before anything is watching is an
    // unhandled rejection — which fails the run rather than the assertion.
    const settled = fetchWithTimeout('/api/scorecard/v1/tournaments').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(20_000)
    const err = await settled

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(408)
    // Not "signal is aborted without reason", which is what the abort itself would say.
    expect((err as ApiError).message).toMatch(/took too long/)
  })

  it('waits for a slow request that is still going to arrive', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          setTimeout(() => resolve(new Response('{}', { status: 200 })), 3_000)
          init.signal?.addEventListener('abort', () => reject((init.signal as AbortSignal).reason))
        }),
    )

    const pending = fetchWithTimeout('/api/scorecard/v1/tournaments')
    await vi.advanceTimersByTimeAsync(5_000)

    expect((await pending).status).toBe(200)
  })

  // A polling view comes back through here every twenty seconds. A timer left armed each
  // time would pile up fifteen seconds deep, waiting to abort requests that already landed.
  it('leaves no timer behind once the response has arrived', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))

    await fetchWithTimeout('/api/scorecard/v1/tournaments')

    expect(vi.getTimerCount()).toBe(0)
  })

  // fetch resolves when the headers arrive, so a deadline that stops there leaves the body
  // unbounded — a connection that stalls after the status line is the case this is for.
  it('holds the deadline over the body, not just the headers', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        // Headers landed; the body never does.
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject((init.signal as AbortSignal).reason))
          }),
      } as unknown as Response),
    )

    const settled = fetchWithTimeout('/api/scorecard/v1/tournaments').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(20_000)

    expect(await settled).toBeInstanceOf(ApiError)
  })

  // Losing signal partway through a response is likelier than losing it before the status
  // line. Read as an empty success, it renders as "nothing here yet" — a claim about data
  // that never arrived, with no error and no Try again.
  it('does not turn a body that fails mid-read into an empty success', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.reject(new TypeError('network error')),
      } as unknown as Response),
    )

    await expect(fetchWithTimeout('/api/scorecard/v1/tournaments')).rejects.toBeInstanceOf(TypeError)
  })

  // The other half: a response that already failed keeps its status when its body will not
  // read, rather than losing the 502 to a TypeError about the body.
  it('keeps the status of a failed response whose body will not read', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        status: 502,
        ok: false,
        statusText: 'Bad Gateway',
        headers: new Headers(),
        text: () => Promise.reject(new TypeError('Body is unusable')),
      } as unknown as Response),
    )

    expect((await fetchWithTimeout('/api/scorecard/v1/tournaments')).status).toBe(502)
  })

  it('lets a caller cancel during the body read, not only before it', async () => {
    const caller = new AbortController()
    // Aborted once the read is under way — cancelling before it starts tests the headers
    // again, which is the half that already worked.
    let reading: () => void = () => {}
    const underWay = new Promise<void>((resolve) => (reading = resolve))
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      Promise.resolve({
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: new Headers(),
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
            reading()
          }),
      } as unknown as Response),
    )

    const settled = fetchWithTimeout('/api/scorecard/v1/tournaments', { signal: caller.signal }).catch((e: unknown) => e)
    await underWay
    caller.abort()
    const err = await settled

    expect((err as DOMException).name).toBe('AbortError')
  })

  // Taking a caller's signal and dropping it would hand the first component that wants
  // cancel-on-unmount a request that quietly never cancels.
  it('lets a caller cancel through their own signal', async () => {
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const caller = new AbortController()

    const settled = fetchWithTimeout('/api/scorecard/v1/tournaments', { signal: caller.signal }).catch((e: unknown) => e)
    caller.abort()
    const err = await settled

    // Their cancellation, not this deadline — so not dressed up as one.
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as DOMException).name).toBe('AbortError')
  })

  // Offline is a different failure and stays as it was — the caller sees the platform's
  // own rejection rather than one dressed up as a timeout.
  it('leaves a network failure alone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchWithTimeout('/api/scorecard/v1/tournaments')).rejects.toBeInstanceOf(TypeError)
  })
})

describe('shouldRetry', () => {
  it('gives a blip one more go', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(false)
  })

  // Retrying one of these puts a second fifteen seconds in front of the Try again button
  // that bounding the request was meant to bring forward.
  it('does not spend another deadline on a request that already used one', () => {
    expect(shouldRetry(0, new ApiError(408, 'The server took too long to answer.'))).toBe(false)
  })

  it('still retries a server error, which may well be transient', () => {
    expect(shouldRetry(0, new ApiError(503, 'unavailable'))).toBe(true)
  })
})
