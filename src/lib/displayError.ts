const FALLBACK = 'Sorry, something went wrong. Please try again later.'

// Services never serialize an internal error, so whatever arrived is safe to show as-is.
export function displayError(err: unknown): string {
  return (err instanceof Error && err.message.trim()) || FALLBACK
}
