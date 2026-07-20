import { ApiClient } from './client'
import type { MatchFormat, Tournament } from './types'
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
}
