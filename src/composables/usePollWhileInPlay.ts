import { shallowRef, watchEffect } from 'vue'
import { useCoarseClock } from './useCoarseClock'
import { cupInPlay } from '@/lib/scoringWindow'
import type { MatchResult } from '@/api/types'

// Twenty seconds while the cup is being played, five minutes otherwise. Not zero when idle:
// an unpublished schedule reads as not in play, and only a request turns that list full.
export function usePollWhileInPlay(now = useCoarseClock()) {
  // Taken as an argument so a view already running a clock does not start a second.
  const results = shallowRef<MatchResult[]>([])
  return {
    intervalMs: () => (cupInPlay(results.value, now.value) ? 20_000 : 300_000),
    // Fed after useAsync returns rather than read from it: naming that cycle directly makes
    // `data` circular for inference, which is what the ref is here to break.
    follow: (from: () => MatchResult[]) => watchEffect(() => (results.value = from())),
  }
}
