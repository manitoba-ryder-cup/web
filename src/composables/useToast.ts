import { reactive } from 'vue'

// A tiny global toast queue: transient confirmations for actions whose result isn't
// otherwise visible (login, creating a match). Module-level state makes it a singleton —
// `toast.success(...)` anywhere feeds the one <AppToasts> container mounted in the shell.
export type ToastVariant = 'success' | 'error'
export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const toasts = reactive<Toast[]>([])
let nextId = 0
const DISMISS_MS = 3500

function dismiss(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

function push(message: string, variant: ToastVariant) {
  const id = ++nextId
  toasts.push({ id, message, variant })
  setTimeout(() => dismiss(id), DISMISS_MS)
}

// The container reads this; components call `toast.*` to raise one.
export function useToasts() {
  return { toasts, dismiss }
}

export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
}
