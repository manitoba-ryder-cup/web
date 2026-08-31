export const FALLBACK = 'Sorry, something went wrong. Please try again later.'

// Only a sentence the API wrote reaches here as a message, so whatever arrived is safe to show.
export function displayError(err: unknown): string {
  return (err instanceof Error && err.message.trim()) || FALLBACK
}
