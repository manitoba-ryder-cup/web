// Mirrors the Go SDK wire shapes (snake_case).
export interface LoginRequest { email: string; password: string }
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}
export interface User { id: string; email: string; first_name: string; last_name: string }
export interface Tournament { id: string; name: string; start_date: string; end_date: string; location: string }
export interface MatchFormat { id: string; name: string }
export interface PlayerSummary { id: string; first_name: string; last_name: string; email: string | null }
export interface TournamentTeam { id: string; color: string; captain: PlayerSummary | null; points: number }
export interface WinnerResponse { finished: boolean; winner_team_id: string | null }
export class ApiError extends Error {
  // Explicit field + assignment (not a constructor parameter property): this
  // project's tsconfig sets erasableSyntaxOnly, which disallows that shorthand.
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
