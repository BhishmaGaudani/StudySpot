// The "How busy is it?" card that appears when you're near a spot.

import type { BusyLevel, Spot } from '../types'

const CHOICES: { level: BusyLevel; label: string; className: string }[] = [
  { level: 'not_busy', label: 'Not busy', className: 'bg-green-600 hover:bg-green-700' },
  { level: 'moderate', label: 'Moderate', className: 'bg-amber-500 hover:bg-amber-600' },
  { level: 'busy', label: 'Busy', className: 'bg-red-600 hover:bg-red-700' },
]

interface Props {
  spot: Spot
  submitting: boolean
  error: string | null
  onSubmit: (level: BusyLevel) => void
  onSkip: () => void
}

export function ReportPrompt({ spot, submitting, error, onSubmit, onSkip }: Props) {
  return (
    <div role="dialog" aria-labelledby="report-title" className="rounded-xl border border-sbu/20 bg-white p-4 shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-sbu">You're at {spot.name}</p>
      <h2 id="report-title" className="mt-1 text-lg font-semibold text-gray-900">
        How busy is it right now?
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.level}
            type="button"
            disabled={submitting}
            onClick={() => onSubmit(c.level)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${c.className}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={onSkip}
        disabled={submitting}
        className="mt-2 w-full rounded-lg py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        Skip for now
      </button>
    </div>
  )
}
