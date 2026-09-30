// Decides when to ask "How busy is it?" and handles the answer.
//
// We prompt for the nearest spot you're within 100 m of, unless:
//   - you already reported it in the last 30 min (the server would reject it;
//     we load these "cooldowns" from GET /api/reports/cooldowns), or
//   - you pressed Skip for it in the last 30 min (saved in localStorage so a
//     refresh doesn't bring the prompt straight back).
//
// Unlike the old version, nothing is logged just because the prompt appeared.
// It only goes away when you answer or skip.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { REPORT_RADIUS_M, distanceM } from '../lib/geo'
import type { BusyLevel, Coords, Spot } from '../types'

const SKIP_KEY = 'studyspot_skips'
const SKIP_MS = 30 * 60_000

type Timestamps = Record<number, number> // location id -> time (ms) until which we don't prompt

function loadSkips(): Timestamps {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function useReportPrompt(
  spots: Spot[],
  coords: Coords | null,
  now: number,
  onReported: (spot: Spot) => void,
) {
  const [cooldowns, setCooldowns] = useState<Timestamps>({})
  const [skips, setSkips] = useState<Timestamps>(loadSkips)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ spotId: number; message: string } | null>(null)
  const [thanks, setThanks] = useState<string | null>(null)

  const refreshCooldowns = useCallback(() => {
    api
      .cooldowns()
      .then((list) =>
        setCooldowns(Object.fromEntries(list.map((c) => [c.location_id, Date.parse(c.next_report_at)]))),
      )
      .catch(() => {}) // not critical: worst case the server rejects a duplicate report
  }, [])

  useEffect(refreshCooldowns, [refreshCooldowns])

  useEffect(() => {
    localStorage.setItem(SKIP_KEY, JSON.stringify(skips))
  }, [skips])

  // The spot to ask about right now, or null.
  const promptSpot = useMemo(() => {
    if (!coords) return null
    const candidates = spots
      .map((spot) => ({ spot, dist: distanceM(coords, spot) }))
      .filter(({ spot, dist }) => {
        const blockedUntil = Math.max(cooldowns[spot.id] ?? 0, skips[spot.id] ?? 0)
        return dist <= REPORT_RADIUS_M && blockedUntil <= now
      })
      .sort((a, b) => a.dist - b.dist)
    return candidates[0]?.spot ?? null
  }, [spots, coords, cooldowns, skips, now])

  const skip = () => {
    if (promptSpot) setSkips((s) => ({ ...s, [promptSpot.id]: Date.now() + SKIP_MS }))
  }

  const submit = async (level: BusyLevel) => {
    if (!promptSpot || !coords) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.report(promptSpot.id, level, coords.lat, coords.lon)
      onReported(res.location)
      setCooldowns((c) => ({ ...c, [promptSpot.id]: Date.now() + SKIP_MS }))
      setThanks(`Thanks! ${promptSpot.name} updated for everyone.`)
      setTimeout(() => setThanks(null), 4000)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) refreshCooldowns()
      setError({ spotId: promptSpot.id, message: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  // Only show an error for the spot it happened at, not after you've moved on.
  const visibleError = error && error.spotId === promptSpot?.id ? error.message : null

  return { promptSpot, submit, skip, submitting, error: visibleError, thanks }
}
