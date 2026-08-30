import { ref } from 'vue'
import { toast } from '@/composables/useToast'
import { useAfterWrite } from '@/composables/useAfterWrite'

// `key` distinguishes per-row actions from a single-flight page. The action does its own
// optimistic update; `onError` re-syncs when it fails.
export function useBusy() {
  const busy = ref<string | true | null>(null)
  const afterWrite = useAfterWrite()

  function isBusy(key?: string): boolean {
    return key === undefined ? busy.value !== null : busy.value === key
  }

  // `settled` is for an action that has already told the rest of the app. A match write does,
  // and more precisely than this can, so running both asks twice for answers already in hand.
  async function run(
    key: string | true,
    action: () => Promise<void>,
    opts: { error: string; onError?: () => Promise<void> | void; settled?: boolean },
  ) {
    if (busy.value !== null) return
    busy.value = key
    try {
      await action()
      // Every caller here is a write, and each one used to decide for itself what to tell
      // the rest of the app — three views, three answers, one of them a second request.
      if (!opts.settled) await afterWrite()
    } catch {
      toast.error(opts.error)
      await opts.onError?.()
    } finally {
      busy.value = null
    }
  }

  return { isBusy, run }
}
