// A small wrapper around fetch() for talking to the FastAPI server.
// It adds the login token to every request and turns error responses into
// an ApiError with a readable message, so components can just show err.message.

import type { AuthResponse, Cooldown, PopularTimes, ReportResponse, Spot, User, BusyLevel } from '../types'

const TOKEN_KEY = 'studyspot_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// FastAPI errors look like {"detail": "message"} for errors we raise, or
// {"detail": [{"msg": "...", "loc": [...]}, ...]} when input validation fails.
function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) {
    // "Value error, Use your @stonybrook.edu email" -> "Use your @stonybrook.edu email"
    return String(detail[0].msg).replace(/^Value error, /, '')
  }
  return fallback
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status})`))
  return body as T
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: { name, email, password } }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request<User>('/auth/me'),

  locations: () => request<Spot[]>('/locations'),
  popularTimes: (locationId: number) => request<PopularTimes>(`/locations/${locationId}/popular-times`),

  report: (locationId: number, level: BusyLevel, lat: number, lon: number) =>
    request<ReportResponse>('/reports', {
      method: 'POST',
      body: { location_id: locationId, level, lat, lon },
    }),
  cooldowns: () => request<Cooldown[]>('/reports/cooldowns'),
}
