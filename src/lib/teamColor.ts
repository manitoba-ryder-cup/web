// The single place a team's colour NAME maps to its visual classes. Teams are
// identified by id everywhere else; this is only consulted to paint them. Add a new
// colour here (e.g. Green, Purple) and nothing else in the app needs to change.
export interface TeamColorClasses {
  solid: string // filled background (a decided win)
  soft: string // lighter fill (a projected / in-progress lead) — distinct from the grey toss-up
  softText: string // lighter coloured text (legible on a dark/photo background)
  text: string // coloured text
  border: string // 5px accent border on the team strip
  tint: string // faint background (lead state)
  line: string // faint border (lead state)
  cssVar: string // the raw colour for SVG fill/stroke (e.g. the match-flow chart)
}

const REGISTRY: Record<string, TeamColorClasses> = {
  Blue: {
    solid: 'bg-mrc-blue-team',
    soft: 'bg-mrc-blue-soft',
    softText: 'text-mrc-blue-soft',
    text: 'text-mrc-blue-team',
    border: 'border-mrc-blue-team',
    tint: 'bg-mrc-blue-tint',
    line: 'border-mrc-blue-line',
    cssVar: 'var(--color-mrc-blue-team)',
  },
  Red: {
    solid: 'bg-mrc-red-team',
    soft: 'bg-mrc-red-soft',
    softText: 'text-mrc-red-soft',
    text: 'text-mrc-red-team',
    border: 'border-mrc-red-team',
    tint: 'bg-mrc-red-tint',
    line: 'border-mrc-red-line',
    cssVar: 'var(--color-mrc-red-team)',
  },
}

const NEUTRAL: TeamColorClasses = {
  solid: 'bg-mrc-panel-alt',
  soft: 'bg-mrc-line-strong',
  softText: 'text-mrc-line-strong',
  text: 'text-mrc-ink',
  border: 'border-mrc-line',
  tint: 'bg-mrc-surface',
  line: 'border-mrc-line',
  cssVar: 'var(--color-mrc-line)',
}

export function teamColor(color: string | null | undefined): TeamColorClasses {
  return (color && REGISTRY[color]) || NEUTRAL
}
