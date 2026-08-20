import type { MatchResult } from '@/api/types'
import { teeDayKey } from './teeTime'

/** A day and a format played together — how an order of play is actually organised. */
export interface Session {
  key: string
  format: string
  matches: MatchResult[]
  teeOffAt: number
}

/** Every session, earliest first. */
export function groupIntoSessions(matches: MatchResult[]): Session[] {
  const groups = new Map<string, MatchResult[]>()
  for (const m of matches) {
    const key = `${teeDayKey(m.tee_time)}|${m.format_name}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups]
    .map(([key, ms]) => ({
      key,
      format: ms[0].format_name,
      matches: [...ms].sort((a, b) => a.tee_time.localeCompare(b.tee_time)),
      teeOffAt: Math.min(...ms.map((m) => new Date(m.tee_time).getTime())),
    }))
    .sort((a, b) => a.teeOffAt - b.teeOffAt)
}

/**
 * The session worth putting on the landing page: the earliest with anything left to play,
 * which is the one being played once it has teed off. Once everything has finished there
 * is no next session — the final standing is the answer and the schedule is history.
 */
export function currentSession(matches: MatchResult[]): Session | null {
  return groupIntoSessions(matches).find((s) => s.matches.some((m) => !m.finished)) ?? null
}
