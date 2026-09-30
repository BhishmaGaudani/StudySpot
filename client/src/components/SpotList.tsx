// Sidebar list of spots: status, distance from you, and last report time.
// Clicking a spot selects it (highlighted on the map, popular times shown).

import { distanceM, formatDistance } from '../lib/geo'
import { timeAgo } from '../lib/status'
import type { Coords, Spot } from '../types'
import { StatusBadge } from './StatusBadge'

interface Props {
  spots: Spot[]
  me: Coords | null
  now: number
  selectedId: number | null
  onSelect: (id: number) => void
}

export function SpotList({ spots, me, now, selectedId, onSelect }: Props) {
  // Closest first once we know where you are
  const rows = spots
    .map((spot) => ({ spot, dist: me ? distanceM(me, spot) : null }))
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))

  return (
    <ul className="space-y-2">
      {rows.map(({ spot, dist }) => (
        <li key={spot.id}>
          <button
            type="button"
            onClick={() => onSelect(spot.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              spot.id === selectedId ? 'border-sbu bg-sbu/5' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-900">{spot.name}</span>
              <StatusBadge status={spot.status} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{dist === null ? 'Distance unknown' : `${formatDistance(dist)} away`}</span>
              <span>
                {spot.last_report_at
                  ? `${spot.report_count} report${spot.report_count === 1 ? '' : 's'} · ${timeAgo(spot.last_report_at, now)}`
                  : 'No reports in 90 min'}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
