import { describe, it, expect, vi, afterEach } from 'vitest'
import { onReachable } from '@/lib/reachable'

function visibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

describe('onReachable', () => {
  afterEach(() => visibility('visible'))

  it('fires when the network comes back', () => {
    const handler = vi.fn()
    const stop = onReachable(handler)

    window.dispatchEvent(new Event('online'))

    expect(handler).toHaveBeenCalledTimes(1)
    stop()
  })

  it('fires when the tab is shown again', () => {
    const handler = vi.fn()
    const stop = onReachable(handler)

    document.dispatchEvent(new Event('visibilitychange'))

    expect(handler).toHaveBeenCalledTimes(1)
    stop()
  })

  // The same event announces a tab going away, and a phone in a pocket has nothing to show
  // for the request.
  it('stays quiet when the tab is being hidden', () => {
    const handler = vi.fn()
    const stop = onReachable(handler)
    visibility('hidden')

    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))

    expect(handler).not.toHaveBeenCalled()
    stop()
  })

  it('stops listening when told to', () => {
    const handler = vi.fn()

    onReachable(handler)()
    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(handler).not.toHaveBeenCalled()
  })
})
