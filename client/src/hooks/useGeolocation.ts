// Tracks the user's position continuously with watchPosition, so walking
// toward a spot updates the distance and can trigger the "How busy is it?"
// prompt. (The old Streamlit version read the location only once.)
//
// `override` is for the dev-only "Pretend I'm at..." picker: when set, it's
// used instead of real GPS so you can test without being on campus.

import { useEffect, useState } from 'react'
import type { Coords } from '../types'

interface GeoState {
  coords: Coords | null
  accuracyM: number | null
  error: string | null
}

const SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useGeolocation(override: Coords | null): GeoState {
  const [state, setState] = useState<GeoState>({ coords: null, accuracyM: null, error: null })

  useEffect(() => {
    if (override || !SUPPORTED) return // no GPS needed while pretending
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          accuracyM: pos.coords.accuracy,
          error: null,
        }),
      (err) =>
        setState((s) => ({
          ...s,
          error:
            err.code === err.PERMISSION_DENIED
              ? 'Location access is blocked. Allow it in your browser to report busyness.'
              : "Couldn't get your location.",
        })),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [override])

  if (override) return { coords: override, accuracyM: 0, error: null }
  if (!SUPPORTED) return { coords: null, accuracyM: null, error: "This browser can't share your location." }
  return state
}
