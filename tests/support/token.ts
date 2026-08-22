// Minus the signature, which is the point: nothing in the client verifies it — the payload
// decides what to offer and the services decide what is allowed.
export function tokenWithScopes(scopes: string[]): string {
  const body = btoa(JSON.stringify({ scopes })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${body}.signature`
}
