// DEV ONLY: "Pretend I'm at..." dropdown for testing without being on campus.
// Dashboard only renders this when import.meta.env.DEV is true, which Vite
// sets for `npm run dev` and never in a production build.
//
// The server still runs its distance check. Pretending puts you about 20 m
// from the spot, just like a real phone standing outside the entrance would.

import type { Coords, Spot } from '../types'

// About 1 km south of campus: outside every spot's 100 m radius
const FAR_AWAY: Coords = { lat: 40.9055, lon: -73.1225 }

interface Props {
  spots: Spot[]
  value: string
  onChange: (value: string, coords: Coords | null) => void
}

export function DevLocationPicker({ spots, value, onChange }: Props) {
  const handle = (v: string) => {
    if (v === 'gps') return onChange(v, null)
    if (v === 'far') return onChange(v, FAR_AWAY)
    const spot = spots.find((s) => String(s.id) === v)
    if (spot) onChange(v, { lat: spot.lat - 0.00018, lon: spot.lon })
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900">
      <span className="font-semibold">DEV</span>
      <select value={value} onChange={(e) => handle(e.target.value)} className="bg-transparent outline-none">
        <option value="gps">Use real GPS</option>
        {spots.map((s) => (
          <option key={s.id} value={String(s.id)}>
            Pretend I'm at {s.name}
          </option>
        ))}
        <option value="far">Pretend I'm off campus</option>
      </select>
    </label>
  )
}
