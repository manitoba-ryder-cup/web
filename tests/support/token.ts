// Builds an access token the way heimdall issues one, minus the signature: nothing in the
// client verifies it, which is the point — the payload decides what to offer and the
// services decide what is allowed.
export function tokenWithScopes(scopes: string[]): string {
  const body = btoa(JSON.stringify({ scopes })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${body}.signature`
}
