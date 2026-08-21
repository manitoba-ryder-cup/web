import type { Hole, HoleStatus, MatchSide } from '@/api/types'
import { playerNames, playerSurnames } from '@/lib/matchResult'

// One stroke strip on the hole-entry page. playerId is null for a one-ball format, where
// the score belongs to the team. `scored` separates a recorded par from par-as-a-default,
// which the strip renders differently. priorStrokes/priorPar are the round up to but not
// including this hole, so the strip can show a running total that moves with the choice.
export interface HoleEntry {
  key: string
  teamId: string
  playerId: string | null
  name: string
  strokes: number
  scored: boolean
  priorStrokes: number
  priorPar: number
}

interface Options {
  perPlayer: boolean // Singles/Fourball record a score per player; other formats one per team
  holeNumber: number
  holes: Hole[] // the tee set, for par
  holeStates: HoleStatus[] // every scored hole of the match
}

// What this team or player shot on a hole, or null if they have no score on it.
function strokesOn(state: HoleStatus, teamId: string, playerId: string | null): number | null {
  const team = state.team_scores.find((t) => t.team_id === teamId)
  if (!team) return null
  if (playerId === null) return team.strokes
  return team.player_scores.find((s) => s.player_id === playerId)?.strokes ?? null
}

// Builds the strips for one hole, in side order. Per-player formats must read the
// breakdown, not the side's `strokes` — in Fourball that's only the better of the two.
export function buildHoleEntries(sides: MatchSide[], { perPlayer, holeNumber, holes, holeStates }: Options): HoleEntry[] {
  const parOf = new Map(holes.map((h) => [h.number, h.par]))
  const par = parOf.get(holeNumber) ?? 4
  const scored = holeStates.find((h) => h.hole_number === holeNumber) ?? null

  // A hole with no score contributes to neither total: adding its par without its strokes
  // would report the round as under par by a whole hole.
  function prior(teamId: string, playerId: string | null) {
    let priorStrokes = 0
    let priorPar = 0
    for (const state of holeStates) {
      if (state.hole_number >= holeNumber) continue
      const strokes = strokesOn(state, teamId, playerId)
      const holePar = parOf.get(state.hole_number)
      if (strokes === null || holePar === undefined) continue
      priorStrokes += strokes
      priorPar += holePar
    }
    return { priorStrokes, priorPar }
  }

  const entries: HoleEntry[] = []
  for (const side of sides) {
    for (const player of perPlayer ? side.players : [null]) {
      const playerId = player?.player_id ?? null
      const strokes = scored ? strokesOn(scored, side.team_id, playerId) : null
      entries.push({
        key: player?.player_id ?? side.team_id,
        teamId: side.team_id,
        playerId,
        name: player ? playerNames([player]) : playerSurnames(side.players),
        strokes: strokes ?? par,
        scored: strokes !== null,
        ...prior(side.team_id, playerId),
      })
    }
  }
  return entries
}
