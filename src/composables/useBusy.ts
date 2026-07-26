import { ref } from 'vue'
import { toast } from '@/composables/useToast'

// Runs one write action at a time and reports failures as a toast — the shared shell behind
// the admin mutations (draft, captain, lineup). `key` distinguishes per-row actions (pass a
// player id) from a single-flight page (pass `true`); isBusy(key) / isBusy() reads it back.
// The action does its own optimistic updates; `onError` (e.g. a refetch) re-syncs on failure.
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
