// Distance math for the browser. Same haversine formula as server/app/geo.py.
// The browser uses it to show distances and decide when to prompt; the server
// runs its own copy to decide whether a report is allowed.

import type { Coords } from '../types'

// Must match REPORT_RADIUS_M on the server.
export const REPORT_RADIUS_M = 100

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

export function distanceM(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}
