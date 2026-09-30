// The main screen after login: map on the left, spot list and popular times
// on the right, and the "How busy is it?" prompt when you're near a spot.

import { useState } from 'react'
import { useAuth } from '../auth'
import { CampusMap } from '../components/CampusMap'
import { DevLocationPicker } from '../components/DevLocationPicker'
import { PopularTimes } from '../components/PopularTimes'
import { ReportPrompt } from '../components/ReportPrompt'
import { SpotList } from '../components/SpotList'
import { useGeolocation } from '../hooks/useGeolocation'
import { useLiveSpots } from '../hooks/useLiveSpots'
import { useNow } from '../hooks/useNow'
import { useReportPrompt } from '../hooks/useReportPrompt'
import type { Coords } from '../types'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const now = useNow()
  const { spots, error: spotsError, live, updateSpot } = useLiveSpots()

  // Dev-only location override (see DevLocationPicker)
  const [devChoice, setDevChoice] = useState('gps')
  const [devCoords, setDevCoords] = useState<Coords | null>(null)
  const { coords, error: geoError } = useGeolocation(devCoords)

  const prompt = useReportPrompt(spots, coords, now, updateSpot)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = spots.find((s) => s.id === selectedId) ?? spots[0]

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sbu text-white">📍</span>
          <span className="text-lg font-bold text-gray-900">StudySpot</span>
          <span
            className={`ml-1 hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs sm:inline-flex ${live ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            title={live ? 'Receiving live updates' : 'Reconnecting…'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`} />
            {live ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {import.meta.env.DEV && (
            <DevLocationPicker
              spots={spots}
              value={devChoice}
              onChange={(choice, c) => {
                setDevChoice(choice)
                setDevCoords(c)
              }}
            />
          )}
          <span className="hidden text-sm text-gray-600 md:inline">{user?.name}</span>
          <button type="button" onClick={logout} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            Log out
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="relative h-[45vh] md:h-auto md:flex-1">
          <CampusMap spots={spots} me={coords} selectedId={selected?.id ?? null} onSelect={setSelectedId} />

          {/* Floating over the map so it's hard to miss */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center p-3">
            <div className="pointer-events-auto w-full max-w-md">
              {prompt.promptSpot && (
                <ReportPrompt
                  spot={prompt.promptSpot}
                  submitting={prompt.submitting}
                  error={prompt.error}
                  onSubmit={prompt.submit}
                  onSkip={prompt.skip}
                />
              )}
              {prompt.thanks && (
                <div className="mt-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow">{prompt.thanks}</div>
              )}
            </div>
          </div>
        </section>

        <aside className="w-full overflow-y-auto border-t border-gray-200 p-4 md:w-96 md:border-l md:border-t-0">
          {geoError && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{geoError}</p>}
          {spotsError && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{spotsError}</p>}

          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Study spots</h2>
          <SpotList spots={spots} me={coords} now={now} selectedId={selected?.id ?? null} onSelect={setSelectedId} />

          {selected && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">Popular times · {selected.name}</h2>
              <p className="mb-3 text-xs text-gray-500">Average busyness by hour, last 8 weeks</p>
              <PopularTimes key={selected.id} locationId={selected.id} lastReportAt={selected.last_report_at} now={now} />
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-gray-400">
            Statuses combine reports from the last 90 minutes, with newer reports counting more. Get within 100 m of a spot to
            report.
          </p>
        </aside>
      </main>
    </div>
  )
}
