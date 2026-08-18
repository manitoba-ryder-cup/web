import { describe, it, expect, vi } from 'vitest'
import { reloadOnceForStaleChunk } from '@/lib/staleChunk'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v
    },
  }
}

describe('reloadOnceForStaleChunk', () => {
  it('reloads the first time a chunk fails', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleChunk(fakeStorage(), reload)).toBe(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  // The failure that matters: a chunk still missing from the fresh document is not stale,
  // and reloading for it again leaves the site spinning instead of merely broken.
  it('does not reload a second time in the same session', () => {
    const storage = fakeStorage()
    const reload = vi.fn()
    reloadOnceForStaleChunk(storage, reload)
    expect(reloadOnceForStaleChunk(storage, reload)).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload when a previous session already did', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleChunk(fakeStorage({ 'mrc:reloaded-for-stale-chunk': '1' }), reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
