import { getValidStravaToken } from './strava-token'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export interface StravaRateLimit {
  limit15min: number
  limitDaily: number
  used15min: number
  usedDaily: number
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  elapsed_time: number
  start_date: string
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  total_elevation_gain: number
  elev_high?: number
  elev_low?: number
  start_latlng?: number[]
  end_latlng?: number[]
}

function parseRateLimitHeaders(headers: Headers): StravaRateLimit {
  const [limit15min = 100, limitDaily = 1000] = (
    headers.get('X-RateLimit-Limit') ?? '100,1000'
  )
    .split(',')
    .map(Number)
  const [used15min = 0, usedDaily = 0] = (
    headers.get('X-RateLimit-Usage') ?? '0,0'
  )
    .split(',')
    .map(Number)
  return { limit15min, limitDaily, used15min, usedDaily }
}

async function stravaFetch(
  userId: string,
  path: string,
  options?: RequestInit
): Promise<{ data: unknown; rateLimit: StravaRateLimit }> {
  const accessToken = await getValidStravaToken(userId)

  const res = await fetch(`${STRAVA_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  })

  const rateLimit = parseRateLimitHeaders(res.headers)

  if (res.status === 401) {
    throw new Error('STRAVA_UNAUTHORIZED')
  }

  if (res.status === 429) {
    const err = new Error('STRAVA_RATE_LIMITED') as Error & {
      rateLimit: StravaRateLimit
    }
    err.rateLimit = rateLimit
    throw err
  }

  if (!res.ok) {
    throw new Error(`STRAVA_API_ERROR:${res.status}`)
  }

  const data = await res.json()
  return { data, rateLimit }
}

export async function getAthleteRunCount(
  userId: string,
  athleteId: number
): Promise<number> {
  const { data } = await stravaFetch(userId, `/athletes/${athleteId}/stats`)
  const stats = data as { all_run_totals: { count: number } }
  return stats.all_run_totals.count
}

export interface StravaSplit {
  distance: number
  elapsed_time: number
  elevation_difference: number
  moving_time: number
  split: number
  average_speed: number
  average_heartrate?: number
  average_grade_adjusted_speed?: number
  pace_zone?: number
}

export interface StravaLap {
  id: number
  lap_index: number
  name: string
  elapsed_time: number
  moving_time: number
  distance: number
  start_date: string
  average_speed: number
  max_speed: number
  total_elevation_gain: number
  average_cadence?: number
  average_heartrate?: number
  max_heartrate?: number
  start_index: number
  end_index: number
  pace_zone?: number
}

export interface StravaActivityDetail extends StravaActivity {
  description?: string
  calories?: number
  suffer_score?: number
  average_cadence?: number
  splits_metric?: StravaSplit[]
  laps?: StravaLap[]
}

export async function getActivityDetail(
  userId: string,
  activityId: number
): Promise<{ detail: StravaActivityDetail; rateLimit: StravaRateLimit }> {
  const { data, rateLimit } = await stravaFetch(
    userId,
    `/activities/${activityId}`
  )
  return { detail: data as StravaActivityDetail, rateLimit }
}

export async function getActivities(
  userId: string,
  options: { after?: number; page?: number; perPage?: number } = {}
): Promise<{ activities: StravaActivity[]; rateLimit: StravaRateLimit }> {
  const { after, page = 1, perPage = 200 } = options
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    ...(after !== undefined ? { after: String(after) } : {}),
  })

  const { data, rateLimit } = await stravaFetch(
    userId,
    `/athlete/activities?${params}`
  )
  return { activities: data as StravaActivity[], rateLimit }
}
