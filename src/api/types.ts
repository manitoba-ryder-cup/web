// Mirrors the Go SDK wire shapes (snake_case).
export interface LoginRequest {
  email: string
  password: string
}
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
}
export interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string
  location: string
  // Where the cup is played, as an IANA name. start_date/end_date are calendar dates and
  // tee times are UTC instants; both are read against this, so the app shows the event's
  // own wall clock rather than the viewer's.
  time_zone: string
}
export interface MatchFormat {
  id: string
  name: string
}
export interface Course {
  id: string
  name: string
}
// A course's configured tee set, colour name resolved — a valid (course, tee) option.
export interface TeeSetSummary {
  course_id: string
  tee_color_id: string
  color: string
  slope: number
  rating: number
}
export interface Match {
  id: string
  tournament_id: string
  course_id: string
  tee_color_id: string
  match_format_id: string
  tee_time: string | null
  handicapped: boolean
}
// Body for creating a match. tee_time is RFC3339 (UTC) or null (unscheduled).
export interface CreateMatchBody {
  course_id: string
  tee_color_id: string
  match_format_id: string
  tee_time: string | null
  handicapped: boolean
}
export interface PlayerSummary {
  id: string
  first_name: string
  last_name: string
}
export interface Player {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  photo_path: string
}
export interface PlayerRecord {
  wins: number
  losses: number
  ties: number
}
export interface PlayerProfile extends Player {
  record: PlayerRecord
  cups_won: number
}
// A player's entry in a specific tournament: their team (the draft), tier, and that
// year's biography (per-tournament, so it isn't overwritten between events).
export interface TournamentPlayer {
  tournament_id: string
  player_id: string
  tier: string
  biography: string
  hdcp: number
  first_name: string
  last_name: string
  photo_path: string
  team_id: string | null
  record: PlayerRecord // all-time W-L-T
  cups_won: number // tournaments the player's team has won
}
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
export interface TournamentTeam {
  id: string
  color: string
  captain: PlayerSummary | null
  points: number
}
export interface MatchPlayer {
  player_id: string
  first_name: string
  last_name: string
}
// One team's lineup in a match, by id. Colour is resolved from the tournament's teams.
export interface MatchSide {
  team_id: string
  players: MatchPlayer[]
}
// A match's outcome state. The server's one shape for it: returned by the match status
// read, by submitScore (so a client learns what a score did without re-deriving the
// close-out rule), and flattened into every MatchResult.
export interface MatchStatus {
  finished: boolean
  winner_team_id: string | null // the leader once finished, null while live or halved
  // Who is ahead right now (null = all square), set whether or not the match has
  // finished — so a live view never has to count hole_results to find the leader.
  leader_team_id: string | null
  lead: number
  holes_remaining: number
}
export interface MatchResult extends MatchStatus {
  match_id: string
  format_name: string
  sides: MatchSide[] // the two competing teams; order/colour is the client's concern
  // Per played hole (in order): winning team's id, or null for a halved hole.
  // Length = holes played; holes beyond the length are unplayed.
  hole_results: (string | null)[]
  tee_time: string | null // RFC3339 (UTC), null if unscheduled
  course_name: string
}

// One team's (best-ball) gross score on a hole. In Fourball `strokes` is the better of
// the two balls, so only player_scores says what each player shot. Empty for one-ball
// formats (alt shot/scramble/scotch), where the score belongs to the team.
export interface HoleScore {
  team_id: string
  strokes: number
  player_scores: PlayerHoleScore[]
}
export interface PlayerHoleScore {
  player_id: string
  strokes: number
}
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
// Every score for one hole, recorded together. The hole is written whole or not at all,
// so a dropped connection cannot leave one side scored and the other not.
export interface ScoreSubmission {
  hole_number: number
  scores: ScoreEntry[]
}
// One competitor's score. player_id is null for one-ball team formats (scramble, etc.),
// where the score belongs to the team.
export interface ScoreEntry {
  team_id: string
  player_id: string | null
  strokes: number
}
export interface WinnerResponse {
  finished: boolean
  winner_team_id: string | null
}
export class ApiError extends Error {
  // Explicit field + assignment (not a constructor parameter property): this
  // project's tsconfig sets erasableSyntaxOnly, which disallows that shorthand.
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
