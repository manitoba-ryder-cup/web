// The four destinations the two navs offer. Both ask this same question, so the bottom bar
// and the desktop header cannot light different tabs for the screen you are on.
export type NavSection = 'home' | 'scores' | 'teams' | 'history'

export function navSection(route: { path: string; query: Record<string, unknown> }): NavSection | null {
  const p = route.path
  // Home is `/`, which every path is a prefix of, and History is `/tournaments`, which
  // every match page sits under — both are exact so a drill-in doesn't light two tabs.
  if (p === '/') return 'home'
  if (/^\/tournaments\/[^/]/.test(p)) return 'scores'
  if (p === '/tournaments') return 'history'
  // A profile belongs to no list of its own: it belongs to the one that opened it, named
  // by the same `from` the header's back link reads.
  if (/^\/players\//.test(p)) return route.query.from === 'history' ? 'history' : 'teams'
  if (/^\/teams(\/|$)/.test(p)) return 'teams'
  return null
}
