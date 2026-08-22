// Unverified on purpose: the answer decides what to offer, never what to allow. Anything
// unreadable yields no scopes, so a malformed token offers nothing.
export function scopesFrom(token: string | null): string[] {
  const payload = token?.split('.')[1]
  if (!payload) return []
  try {
    const json = atob(
      payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '='),
    )
    const scopes: unknown = JSON.parse(json)?.scopes
    return Array.isArray(scopes) ? scopes.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}
