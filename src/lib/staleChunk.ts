// A deploy replaces the hashed chunks an already-loaded page still points at, so a lazily
// imported route can fail partway through a session. Reloading picks up the new document.
//
// Once per session, though: if the fresh document still cannot load the chunk then the
// problem is not staleness, and reloading again would spin rather than recover.

const RELOADED_KEY = 'mrc:reloaded-for-stale-chunk'

type ReadWriteStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Reloads once per session for a failed chunk. Returns whether it reloaded. */
export function reloadOnceForStaleChunk(storage: ReadWriteStorage, reload: () => void): boolean {
  if (storage.getItem(RELOADED_KEY) !== null) return false
  storage.setItem(RELOADED_KEY, '1')
  reload()
  return true
}
