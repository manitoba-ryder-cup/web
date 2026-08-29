/** Runs the handler at the two moments a stalled lookup is worth repeating: the network
 *  coming back, and the tab being shown again. Returns a function that stops listening. */
export function onReachable(handler: () => void): () => void {
  // Hidden tabs are skipped rather than woken: a phone in a pocket has nothing to show for it,
  // and `visibilitychange` fires on the way out as well as the way in.
  const fire = () => {
    if (document.visibilityState === 'visible') handler()
  }
  window.addEventListener('online', fire)
  document.addEventListener('visibilitychange', fire)
  return () => {
    window.removeEventListener('online', fire)
    document.removeEventListener('visibilitychange', fire)
  }
}
