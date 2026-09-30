// Shapes of the data the API sends back. These mirror server/app/schemas.py.

export type BusyLevel = 'not_busy' | 'moderate' | 'busy'
export type SpotStatus = BusyLevel | 'no_data'

export interface User {
  id: number
  name: string
  email: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Spot {
  id: number
  slug: string
  name: string
  lat: number
  lon: number
  status: SpotStatus
  score: number | null
  report_count: number
  last_report_at: string | null
}

export interface ReportResponse {
  id: number
  location_id: number
  level: BusyLevel
  created_at: string
  location: Spot
}

export interface Cooldown {
  location_id: number
  next_report_at: string
}

export interface HourBucket {
  hour: number
  avg_score: number | null
  report_count: number
}

export interface PopularTimes {
  location_id: number
  weeks: number
  hours: HourBucket[]
}

export interface Coords {
  lat: number
  lon: number
}
