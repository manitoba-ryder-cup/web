import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// A browser is the only place this really runs, so these guard the two properties that were
// got wrong rather than the behaviour itself.
const worker = readFileSync(resolve(__dirname, '../../public/service-worker.js'), 'utf8')

describe('public/service-worker.js', () => {
  it('unregisters itself', () => {
    expect(worker).toContain('self.registration.unregister()')
  })

  // Unregistering first lets the worker be torn down before the caches are gone, leaving the
  // old app shell on disk. Verified in a browser: the cache survived until these swapped.
  it('empties the caches before unregistering, not after', () => {
    expect(worker.indexOf('caches.delete')).toBeLessThan(worker.indexOf('self.registration.unregister()'))
  })

  it('reloads the tabs still showing the old app', () => {
    expect(worker).toContain('client.navigate')
  })

  // It must claim the update immediately; waiting for every tab to close would strand
  // exactly the visitors it exists to rescue.
  it('activates without waiting', () => {
    expect(worker).toContain('skipWaiting()')
  })
})
