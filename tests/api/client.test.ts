import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from '@/api/client'

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

    await expect(client.get('/v1/tournaments')).rejects.toMatchObject({ status: 502 })
    // Some message, naming the status, rather than the empty body verbatim.
    await expect(client.get('/v1/tournaments')).rejects.toThrow(/502/)
  })

  it('keeps a plain-text failure body as the message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('upstream exploded', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())

    await expect(client.get('/v1/tournaments')).rejects.toMatchObject({ message: 'upstream exploded' })
  })

  it('throws ApiError when a refreshed retry still fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new ApiClient('/api/scorecard', () => 't', vi.fn())
    await expect(client.get('/v1/tournaments')).rejects.toMatchObject({ status: 401 })
  })
})
