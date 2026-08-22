// A deploy replaces the chunks a loaded page still points at. Once per session only: if the
// fresh document still cannot load it, the problem is not staleness and reloading spins.

const RELOADED_KEY = 'mrc:reloaded-for-stale-chunk'

type ReadWriteStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Reloads once per session for a failed chunk. Returns whether it reloaded. */
export function reloadOnceForStaleChunk(storage: ReadWriteStorage, reload: () => void): boolean {
  if (storage.getItem(RELOADED_KEY) !== null) return false
  storage.setItem(RELOADED_KEY, '1')
  reload()
  return true
}
