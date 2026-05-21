// Tournament Types

export type MatchStatus = 'pending' | 'in_progress' | 'completed'
export type TournamentStatus = 'not_started' | 'in_progress' | 'completed'

export interface Player {
  id: string
  name: string
  seed: number
  eliminated: boolean
  created_at: string
}

export interface Match {
  id: string
  round: number
  match_number: number
  player1_id: string | null
  player2_id: string | null
  player1_name: string | null
  player2_name: string | null
  game1_p1_score: number | null
  game1_p2_score: number | null
  game2_p1_score: number | null
  game2_p2_score: number | null
  game3_p1_score: number | null
  game3_p2_score: number | null
  winner_id: string | null
  status: MatchStatus
  room_number: number | null
  created_at: string
}

export interface TournamentState {
  id: string
  status: TournamentStatus
  updated_at: string
}

// Bracket structure for a single-elimination match
export interface BracketMatch {
  match: Match | null
  position: {
    round: number
    matchNumber: number
  }
}

// Game scores for a match
export interface GameScores {
  game1_p1_score: number | null
  game1_p2_score: number | null
  game2_p1_score: number | null
  game2_p2_score: number | null
  game3_p1_score: number | null
  game3_p2_score: number | null
}

// Helper to determine match winner from scores
export function determineMatchWinner(scores: GameScores): 'p1' | 'p2' | null {
  let p1Wins = 0
  let p2Wins = 0

  // Game 1
  if (scores.game1_p1_score !== null && scores.game1_p2_score !== null) {
    if (scores.game1_p1_score > scores.game1_p2_score) p1Wins++
    else if (scores.game1_p2_score > scores.game1_p1_score) p2Wins++
  }

  // Game 2
  if (scores.game2_p1_score !== null && scores.game2_p2_score !== null) {
    if (scores.game2_p1_score > scores.game2_p2_score) p1Wins++
    else if (scores.game2_p2_score > scores.game2_p1_score) p2Wins++
  }

  // Check for 2-0 sweep
  if (p1Wins >= 2) return 'p1'
  if (p2Wins >= 2) return 'p2'

  // Game 3 (if needed)
  if (scores.game3_p1_score !== null && scores.game3_p2_score !== null) {
    if (scores.game3_p1_score > scores.game3_p2_score) p1Wins++
    else if (scores.game3_p2_score > scores.game3_p1_score) p2Wins++
  }

  if (p1Wins >= 2) return 'p1'
  if (p2Wins >= 2) return 'p2'

  return null
}

// Check if game 3 is needed
export function needsGame3(scores: GameScores): boolean {
  let p1Wins = 0
  let p2Wins = 0

  if (scores.game1_p1_score !== null && scores.game1_p2_score !== null) {
    if (scores.game1_p1_score > scores.game1_p2_score) p1Wins++
    else if (scores.game1_p2_score > scores.game1_p1_score) p2Wins++
  }

  if (scores.game2_p1_score !== null && scores.game2_p2_score !== null) {
    if (scores.game2_p1_score > scores.game2_p2_score) p1Wins++
    else if (scores.game2_p2_score > scores.game2_p1_score) p2Wins++
  }

  // Need game 3 if it's 1-1
  return p1Wins === 1 && p2Wins === 1
}

// Standard 32-player single elimination bracket seeding matchups
// Match 1 is Seed 1 vs 32, etc. (balanced sections)
export const BRACKET_MATCHUPS: Array<{ match: number; seed1: number; seed2: number }> = [
  { match: 1, seed1: 1, seed2: 32 },
  { match: 2, seed1: 17, seed2: 16 },
  { match: 3, seed1: 9, seed2: 24 },
  { match: 4, seed1: 25, seed2: 8 },
  { match: 5, seed1: 5, seed2: 28 },
  { match: 6, seed1: 21, seed2: 12 },
  { match: 7, seed1: 13, seed2: 20 },
  { match: 8, seed1: 29, seed2: 4 },
  { match: 9, seed1: 3, seed2: 30 },
  { match: 10, seed1: 19, seed2: 14 },
  { match: 11, seed1: 11, seed2: 22 },
  { match: 12, seed1: 27, seed2: 6 },
  { match: 13, seed1: 7, seed2: 26 },
  { match: 14, seed1: 23, seed2: 10 },
  { match: 15, seed1: 15, seed2: 18 },
  { match: 16, seed1: 31, seed2: 2 },
]
