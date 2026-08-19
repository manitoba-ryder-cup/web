// The scopes scorecard enforces on its write routes, mirroring its sdk/scopes.go. The
// client reads them off the access token to decide what to show; the API is what refuses.
export const SCOPE_TOURNAMENTS_WRITE = 'scorecard:tournaments:write'
export const SCOPE_PLAYERS_WRITE = 'scorecard:players:write'
export const SCOPE_SCORES_WRITE = 'scorecard:scores:write'
export const SCOPE_COURSES_WRITE = 'scorecard:courses:write'
