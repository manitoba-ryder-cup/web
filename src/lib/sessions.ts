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
 * The earliest session with anything left to play: the one on the course, or the one due out
 * next. Nothing left means the cup is over.
 */
export function nextSession(matches: MatchResult[]): Session | null {
  return groupIntoSessions(matches).find((s) => s.matches.some((m) => !m.finished)) ?? null
}

/**
 * The session being played, or the one just played — the closing session once the cup is over.
 * One that has not teed off holds no lineups and no scores, so it waits until it does.
 */
export function sessionInPlay(matches: MatchResult[], now: Date = new Date()): Session | null {
  const sessions = groupIntoSessions(matches)
  const next = sessions.findIndex((s) => s.matches.some((m) => !m.finished))
  if (next < 0) return sessions.at(-1) ?? null
  return sessionUnderWay(sessions[next], now) ? sessions[next] : (sessions[next - 1] ?? null)
}

/**
 * Whether a session is being played: it has reached its first tee time, or a score has landed.
 * Not the scoring window, which opens ahead of the tee to govern writes rather than play.
 */
export function sessionUnderWay(session: Session | null | undefined, now: Date = new Date()): boolean {
  if (!session) return false
  return session.teeOffAt <= now.getTime() || session.matches.some((m) => m.hole_results.length > 0)
}

/**
 * The session to lead with: the next one once it has pairings or has teed off, and until then
 * the one just played. Before the cup nothing has been played, so the schedule is still it.
 */
export function headlineSession(matches: MatchResult[], now: Date = new Date()): Session | null {
  const next = nextSession(matches)
  if (!next) return sessionInPlay(matches, now)
  const drawn = next.matches.some((m) => m.sides.some((side) => side.players.length > 0))
  return drawn || sessionUnderWay(next, now) ? next : (sessionInPlay(matches, now) ?? next)
}
