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
export interface Player {
  id: string
  user_id: string | null
  email: string | null
  first_name: string
  last_name: string
  photo_path: string
}
export interface PlayerRecord { wins: number; losses: number; ties: number }
export interface PlayerProfile extends Player { record: PlayerRecord }
export interface PlayerTournamentHistory {
  tournament_id: string
  name: string
  location: string
  start_date: string
  end_date: string
  captain_first_name: string // the player's team that event, identified by captain
  captain_last_name: string
  result: 'won' | 'lost' | 'tied' | 'in_progress'
  record: PlayerRecord
}
export interface TournamentTeam { id: string; color: string; captain: PlayerSummary | null; points: number }
export interface MatchPlayer { player_id: string; first_name: string; last_name: string }
// One team's lineup in a match, by id. Colour is resolved from the tournament's teams.
export interface MatchSide { team_id: string; players: MatchPlayer[] }
export interface MatchResult {
  match_id: string
  format_name: string
  finished: boolean
  winner_team_id: string | null // null = halved or unfinished
  lead: number
  holes_remaining: number
  sides: MatchSide[] // the two competing teams; order/colour is the client's concern
  // Per played hole (in order): winning team's id, or null for a halved hole.
  // Length = holes played; holes beyond the length are unplayed.
  hole_results: (string | null)[]
  tee_time: string | null // RFC3339 (UTC), null if unscheduled
}

// One team's (best-ball) gross score on a hole.
export interface HoleScore { team_id: string; strokes: number }
// The match-play state after a scored hole (only scored holes are returned).
export interface HoleStatus {
  hole_number: number
  team_scores: HoleScore[]
  leader_team_id: string | null // who leads after this hole (null = all square)
  lead: number // margin in holes (>= 0)
  holes_remaining: number
  decided: boolean // lead exceeds holes remaining — match closed out here
}
// One hole of a match's tee set (course setup): par + stroke index + yardage.
export interface Hole {
  number: number
  par: number
  hdcp: number
  yards: number
}
// One hole score to record. player_id is null for one-ball team formats (scramble, etc.).
export interface ScoreSubmission {
  hole_number: number
  strokes: number
  team_id: string
  player_id: string | null
}
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
