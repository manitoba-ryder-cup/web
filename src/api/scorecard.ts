import { ApiClient } from './client'
import type { MatchFormat, MatchResult, PlayerProfile, PlayerTournamentHistory, Tournament, TournamentTeam, WinnerResponse } from './types'
import { useAuthStore } from '@/stores/auth'

let client: ApiClient | null = null
function sc(): ApiClient {
  if (!client) {
    const auth = useAuthStore()
    client = new ApiClient('/api/scorecard', () => auth.accessToken, () => auth.refresh())
  }
  return client
}

export const scorecardApi = {
  // Truly public route (no tenant, no token needed).
  listMatchFormats: () => sc().get<MatchFormat[]>('/v1/match-formats'),
  // Tenant-scoped; requires the logged-in user's token.
  listTournaments: () => sc().get<Tournament[]>('/v1/tournaments'),
  getTournament: (id: string) => sc().get<Tournament>(`/v1/tournaments/${id}`),
  getTournamentTeams: (id: string) => sc().get<TournamentTeam[]>(`/v1/tournaments/${id}/teams`),
  getTournamentWinner: (id: string) => sc().get<WinnerResponse>(`/v1/tournaments/${id}/winner`),
  getTournamentResults: (id: string) => sc().get<MatchResult[]>(`/v1/tournaments/${id}/results`),
  listPlayers: () => sc().get<PlayerProfile[]>('/v1/players'),
  getPlayer: (id: string) => sc().get<PlayerProfile>(`/v1/players/${id}`),
  getPlayerTournaments: (id: string) =>
    sc().get<PlayerTournamentHistory[]>(`/v1/players/${id}/tournaments`),
}
