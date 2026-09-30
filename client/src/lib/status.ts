// How each busyness level looks in the UI, kept in one place so the map,
// badges and chart all use the same labels and colors.

import type { SpotStatus } from '../types'

export const STATUS_STYLE: Record<SpotStatus, { label: string; color: string; badge: string }> = {
  not_busy: { label: 'Not busy', color: '#16a34a', badge: 'bg-green-100 text-green-800 ring-green-600/20' },
  moderate: { label: 'Moderate', color: '#d97706', badge: 'bg-amber-100 text-amber-800 ring-amber-600/20' },
  busy: { label: 'Busy', color: '#dc2626', badge: 'bg-red-100 text-red-800 ring-red-600/20' },
  no_data: { label: 'No recent data', color: '#9ca3af', badge: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
}

// Map a 0..2 score to a color, using the same cutoffs as the server algorithm.
export function scoreColor(score: number): string {
  if (score < 0.67) return STATUS_STYLE.not_busy.color
  if (score < 1.34) return STATUS_STYLE.moderate.color
  return STATUS_STYLE.busy.color
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  return `${Math.floor(min / 60)} h ago`
}
