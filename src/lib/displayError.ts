import { ApiError } from '@/api/types'

export const FALLBACK = 'Sorry, something went wrong. Please try again later.'

// Only an ApiError carries a sentence written for a reader. A rejection that never reached a
// response carries the browser's own wording, which is no more ours to show than a filter's.
export function displayError(err: unknown): string {
  return (err instanceof ApiError && err.message.trim()) || FALLBACK
}
