import { ApiClient } from './client'
import type {
  LineupPlayer,
  Course,
  CreateMatchBody,
  UpdateMatchBody,
  Hole,
  HoleStatus,
  Match,
  MatchFormat,
  MatchResult,
  ScoreSubmissionResult,
  PlayerProfile,
  PlayerStats,
  PlayerTournamentHistory,
  ScoreSubmission,
  TeeSetSummary,
  Tournament,
  TournamentPlayer,
  EnterTournamentPlayerBody,
  UpdateTournamentPlayerBody,
  TournamentTeam,
  WinnerResponse,
} from './types'
import { orderTeams } from '@/lib/teamOrder'
import { useAuthStore } from '@/stores/auth'

let client: ApiClient | null = null
function sc(): ApiClient {
  if (!client) {
    const auth = useAuthStore()
    client = new ApiClient(
      '/api/scorecard',
      () => auth.accessToken,
      () => auth.refresh(),
    )
  }
  return client
}

export const scorecardApi = {
  // Truly public route (no tenant, no token needed).
  listMatchFormats: () => sc().get<MatchFormat[]>('/v1/match-formats'),
  // Tenant-scoped; requires the logged-in user's token.
  listTournaments: () => sc().get<Tournament[]>('/v1/tournaments'),
  getTournament: (id: string) => sc().get<Tournament>(`/v1/tournaments/${id}`),
  // Teams enter the app ordered Blue-left/Red-right — the one place team order is set,
  // so no view or component re-sorts them.
  getTournamentTeams: (id: string) => sc().get<TournamentTeam[]>(`/v1/tournaments/${id}/teams`).then(orderTeams),
  getTournamentWinner: (id: string) => sc().get<WinnerResponse>(`/v1/tournaments/${id}/winner`),
  getTournamentResults: (id: string) => sc().get<MatchResult[]>(`/v1/tournaments/${id}/results`),
  getTournamentPlayers: (id: string) => sc().get<TournamentPlayer[]>(`/v1/tournaments/${id}/players`),
  enterTournamentPlayer: (tournamentId: string, body: EnterTournamentPlayerBody) =>
    sc().post<TournamentPlayer>(`/v1/tournaments/${tournamentId}/players`, body),
  updateTournamentPlayer: (tournamentId: string, playerId: string, body: UpdateTournamentPlayerBody) =>
    sc().put<TournamentPlayer>(`/v1/tournaments/${tournamentId}/players/${playerId}`, body),
  getMatchScores: (id: string) => sc().get<HoleStatus[]>(`/v1/matches/${id}/scores`),
  getMatchHoles: (id: string) => sc().get<Hole[]>(`/v1/matches/${id}/holes`),
  // One write. Returns the recomputed state, so the caller sees whether that hole closed the
  // match out. 409 if the match is complete and the hole was never played.
  submitHoleScores: (matchId: string, body: ScoreSubmission) => sc().post<ScoreSubmissionResult>(`/v1/matches/${matchId}/scores`, body),
  listPlayers: () => sc().get<PlayerProfile[]>('/v1/players'),
  getPlayer: (id: string) => sc().get<PlayerProfile>(`/v1/players/${id}`),
  getPlayerTournaments: (id: string) => sc().get<PlayerTournamentHistory[]>(`/v1/players/${id}/tournaments`),
  getPlayerStats: (id: string) => sc().get<PlayerStats>(`/v1/players/${id}/stats`),

  // --- Admin writes (tournaments:write scope) ---

  // Undrafting a player named in a lineup is refused with a 409 — substitute them out of the
  // match first. Moving a drafted player between sides is undraft-then-draft.
  draftPlayer: (teamId: string, playerId: string) => sc().post<void>(`/v1/teams/${teamId}/members`, { player_id: playerId }),
  undraftPlayer: (teamId: string, playerId: string) => sc().del<void>(`/v1/teams/${teamId}/members/${playerId}`),
  // One captain a side. The PUT replaces whoever held it, and the DELETE leaves the side
  // with none.
  setTeamCaptain: (teamId: string, captainId: string) => sc().put<void>(`/v1/teams/${teamId}/captain`, { captain_id: captainId }),
  clearTeamCaptain: (teamId: string) => sc().del<void>(`/v1/teams/${teamId}/captain`),
  // The whole lineup in one write: sized against the format, refused on a scored match, so
  // there is no per-player add or remove to get half way through.
  setLineup: (matchId: string, participants: LineupPlayer[]) => sc().put<void>(`/v1/matches/${matchId}/participants`, { participants }),
  resetMatch: (matchId: string) => sc().del<void>(`/v1/matches/${matchId}/scores`),
  // Match setup: courses + their tee sets feed the create-match form.
  listCourses: () => sc().get<Course[]>('/v1/courses'),
  getCourseTees: (courseId: string) => sc().get<TeeSetSummary[]>(`/v1/courses/${courseId}/tees`),
  listMatches: (tournamentId: string) => sc().get<Match[]>(`/v1/tournaments/${tournamentId}/matches`),
  createMatch: (tournamentId: string, body: CreateMatchBody) => sc().post<Match>(`/v1/tournaments/${tournamentId}/matches`, body),
  updateMatch: (matchId: string, body: UpdateMatchBody) => sc().put<Match>(`/v1/matches/${matchId}`, body),
  deleteMatch: (matchId: string) => sc().del<void>(`/v1/matches/${matchId}`),
}
