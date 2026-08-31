import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from '@/api/client'
import { ApiError } from '@/api/types'
import { FALLBACK } from '@/lib/displayError'

const FILTER_REASON = 'Access Denied by Barracuda Web Filter - contact your administrator'

const BLOCK_PAGE =
  '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html><head><style>.pg{background:url("data:image/png;base64,iVBORw0KGgo")}</style></head><body>Blocked: Newly Registered Domains</body></html>'

describe('ApiClient', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('attaches the Bearer token from the token getter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 'tok-123', vi.fn())
    await client.get('/v1/tournaments')
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-123')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scorecard/v1/tournaments')
  })

  it('on 401 refreshes once and retries with the new token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    let token = 'stale'
    const refresh = vi.fn().mockImplementation(async () => {
      token = 'fresh'
    })
    const client = new ApiClient('/api/scorecard', () => token, refresh)
    await client.get('/v1/tournaments')
    expect(refresh).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryHeaders = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe('Bearer fresh')
  })

  it("unwraps the server's error envelope into the message", async () => {
    // The API answers errors as {"error": "..."}; the raw JSON would otherwise be shown
    // to the user verbatim.
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":"Match not found"}', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    await expect(client.get('/v1/matches/x')).rejects.toMatchObject({ status: 404, message: 'Match not found' })
  })

  it('still describes a failure that arrives with no body', async () => {
    // A proxy or gateway failing in front of the API sends an empty 502. An ApiError with
    // an empty message reads as no error at all to anything checking truthiness.
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    const err = await client.get<never>('/v1/tournaments').catch((e: unknown) => e as ApiError)

    expect(err.message).toBe(FALLBACK)
  })

  // A filter, a captive portal or a gateway answers with its own page, and this app rendered
  // the whole of it: a DOCTYPE, base64 images and CSS, in the box meant for one sentence.
  it('does not put a page it did not write in front of a reader', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(BLOCK_PAGE, { status: 403, statusText: FILTER_REASON }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    const err = await client.get<never>('/v1/players').catch((e: unknown) => e as ApiError)

    expect(err.message).toBe(FALLBACK)
  })

  // The reason phrase is written by whoever answered, exactly like the body, so a filter puts
  // its own wording there too. Set explicitly because undici leaves it empty otherwise.
  it('does not take the reason phrase as copy either', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403, statusText: FILTER_REASON }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    const err = await client.get<never>('/v1/players').catch((e: unknown) => e as ApiError)

    expect(err.message).not.toContain('Barracuda')
    expect(err.message).toBe(FALLBACK)
  })

  // Plain text is no more a sentence for a reader than markup is — and it need not come from a
  // filter: the proxy-secret middleware refuses with a bare "forbidden" from the API's own process.
  it('does not pass a plain-text failure through as copy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    const err = await client.get<never>('/v1/tournaments').catch((e: unknown) => e as ApiError)

    expect(err.message).toBe(FALLBACK)
  })

  // The same interception with a 200 on it: JSON.parse used to throw its own SyntaxError,
  // which reached the page as "Unexpected token '<'".
  it("fails as an ApiError when a success carries somebody else's page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(BLOCK_PAGE, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    const err = await client.get<never>('/v1/players').catch((e: unknown) => e as ApiError)

    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe(FALLBACK)
  })

  it('throws ApiError when a refreshed retry still fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())
    await expect(client.get('/v1/tournaments')).rejects.toMatchObject({ status: 401 })
  })
})
