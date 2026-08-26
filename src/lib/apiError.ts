import { ApiError } from '@/api/types'

// Named, because `err.status === 409` in a catch reads as a number rather than as the server
// refusing what was asked.
export function isStatus(err: unknown, status: number): boolean {
  return err instanceof ApiError && err.status === status
}

// A 4xx is the server saying no, and saying why — a sentence worth showing. Anything else is
// a failure the caller can be invited to retry.
export function isRefusal(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500
}
