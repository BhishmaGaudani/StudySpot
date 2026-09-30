// Keeps the list of spots and their statuses up to date.
//
// 1. Loads all spots from GET /api/locations.
// 2. Opens a WebSocket to /api/ws. Whenever anyone reports, the server pushes
//    that spot's new status and we swap it into the list, so the screen
//    updates instantly for everyone.
// 3. Also re-fetches every minute. Statuses fade over time even when nobody
//    reports (old reports stop counting), and no report means no push.
// If the WebSocket drops (server restart, wifi blip), it reconnects.

import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Spot } from '../types'

const REFRESH_MS = 60_000
const RECONNECT_MS = 3_000

export function useLiveSpots() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false) // is the WebSocket connected?

  const updateSpot = useCallback((updated: Spot) => {
    setSpots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  // Initial load + periodic refresh
  useEffect(() => {
    const load = () =>
      api
        .locations()
        .then((data) => {
          setSpots(data)
          setError(null)
        })
        .catch(() => setError("Couldn't load study spots. Is the server running?"))
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // WebSocket with auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${protocol}://${window.location.host}/api/ws`)
      ws.onopen = () => setLive(true)
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'location_update') updateSpot(msg.location as Spot)
      }
      ws.onclose = () => {
        setLive(false)
        if (!stopped) retry = setTimeout(connect, RECONNECT_MS)
      }
    }
    connect()

    return () => {
      stopped = true
      clearTimeout(retry)
      ws?.close()
    }
  }, [updateSpot])

  return { spots, error, live, updateSpot }
}
