export interface User {
  id: string
  email: string
  display_name: string
  is_admin: boolean
  created_at: string
}

export interface PredictionCategory {
  id: string
  name: string
  description: string | null
  points: number
  display_order: number
  is_sprint_only: boolean
  is_active: boolean
}

export interface RaceWeekend {
  id: string
  season: number
  round: number
  name: string
  short_name: string
  circuit: string
  country: string
  race_date: string
  lock_time: string
  is_sprint: boolean
  is_cancelled: boolean
  status?: 'upcoming' | 'open' | 'locked' | 'scored'
}

export interface PredictionResponse {
  category_id: string
  value: string
  updated_at: number
}

export interface ScoreResponse {
  category_id: string
  points: number
  note: string | null
}

export interface RaceWeekendDetail {
  race_weekend: RaceWeekend
  categories: PredictionCategory[]
  predictions: PredictionResponse[]
  scores: ScoreResponse[]
}

export interface League {
  id: string
  name: string
  owner_id: string
  join_code: string
  member_count?: number
  created_at: string
}

export interface LeagueMember {
  user_id: string
  display_name: string
  total_points: number
  rank: number
}

export interface LeagueDetail {
  id: string
  name: string
  join_code: string
  owner_id: string
  members: LeagueMember[]
}

export interface LeagueRacePredictionEntry {
  category_id: string
  category_name: string
  value: string
  points_awarded: number
  note: string | null
}

export interface LeagueRaceResult {
  user_id: string
  display_name: string
  total_points: number
  predictions: LeagueRacePredictionEntry[]
}

export interface LeagueRaceResponse {
  race_weekend: RaceWeekend
  results: LeagueRaceResult[]
}

export interface AdminScoreEntry {
  user_id: string
  display_name: string
  predictions: {
    category_id: string
    value: string
    points: number | null
    note: string | null
  }[]
}
