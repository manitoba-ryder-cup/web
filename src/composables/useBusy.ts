import { ref } from 'vue'
import { toast } from '@/composables/useToast'

// `key` distinguishes per-row actions from a single-flight page. The action does its own
// optimistic update; `onError` re-syncs when it fails.
export function useBusy() {
  const busy = ref<string | true | null>(null)

  function isBusy(key?: string): boolean {
    return key === undefined ? busy.value !== null : busy.value === key
  }

  async function run(key: string | true, action: () => Promise<void>, opts: { error: string; onError?: () => Promise<void> | void }) {
    if (busy.value !== null) return
    busy.value = key
    try {
      await action()
    } catch {
      toast.error(opts.error)
      await opts.onError?.()
    } finally {
      busy.value = null
    }
  }

  return { isBusy, run }
}
