import { scorecardApi } from '@/api/scorecard'

// Keyed by what the thing is, not by the page asking. Two views naming one resource share the
// answer, and a write invalidates it once for both.
export interface Resource<T> {
  key: readonly unknown[]
  fetch: () => Promise<T>
}

const res = <T>(key: readonly unknown[], fetch: () => Promise<T>): Resource<T> => ({ key, fetch })

export const q = {
  tournaments: () => res(['tournaments'], () => scorecardApi.listTournaments()),
  tournament: (id: string) => res(['tournament', id], () => scorecardApi.getTournament(id)),
  teams: (id: string) => res(['tournament', id, 'teams'], () => scorecardApi.getTournamentTeams(id)),
  results: (id: string) => res(['tournament', id, 'results'], () => scorecardApi.getTournamentResults(id)),
  roster: (id: string) => res(['tournament', id, 'players'], () => scorecardApi.getTournamentPlayers(id)),
  matches: (id: string) => res(['tournament', id, 'matches'], () => scorecardApi.listMatches(id)),

  matchScores: (id: string) => res(['match', id, 'scores'], () => scorecardApi.getMatchScores(id)),
  matchHoles: (id: string) => res(['match', id, 'holes'], () => scorecardApi.getMatchHoles(id)),

  player: (id: string) => res(['player', id], () => scorecardApi.getPlayer(id)),
  playerHistory: (id: string) => res(['player', id, 'tournaments'], () => scorecardApi.getPlayerTournaments(id)),
  playerStats: (id: string) => res(['player', id, 'stats'], () => scorecardApi.getPlayerStats(id)),
  players: () => res(['players'], () => scorecardApi.listPlayers()),

  courses: () => res(['courses'], () => scorecardApi.listCourses()),
  courseTees: (courseId: string) => res(['course', courseId, 'tees'], () => scorecardApi.getCourseTees(courseId)),
  matchFormats: () => res(['match-formats'], () => scorecardApi.listMatchFormats()),
}
