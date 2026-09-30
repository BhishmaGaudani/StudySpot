// "Popular times" bar chart for one spot, like the one on Google Maps.
// Each bar is the average busyness at that hour over the last 8 weeks of
// reports (0 = empty, 2 = packed). Built with plain divs, no chart library.
// The parent gives it key={locationId}, so switching spots mounts a fresh
// copy that starts in the loading state. `lastReportAt` changes whenever the
// spot gets a new report, which triggers a re-fetch so the chart stays current.

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { scoreColor } from '../lib/status'
import type { PopularTimes as PopularTimesData } from '../types'

const FIRST_HOUR = 7 // 7 AM
const LAST_HOUR = 23 // 11 PM

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

interface Props {
  locationId: number
  lastReportAt: string | null
  now: number
}

export function PopularTimes({ locationId, lastReportAt, now }: Props) {
  const [data, setData] = useState<PopularTimesData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .popularTimes(locationId)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [locationId, lastReportAt])

  if (failed) return <p className="text-sm text-gray-500">Couldn't load popular times.</p>
  if (!data) return <div className="h-28 animate-pulse rounded-lg bg-gray-100" />

  const hours = data.hours.filter((h) => h.hour >= FIRST_HOUR && h.hour <= LAST_HOUR)
  const hasData = hours.some((h) => h.report_count > 0)
  // Campus clock (the server groups hours in New York time)
  const currentHour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now),
  )

  return (
    <div>
      <div className="flex h-24 items-end gap-0.5" role="img" aria-label="Average busyness by hour of day">
        {hours.map((h) => {
          // Hours with no reports get a short gray stub so the timeline stays readable
          const pct = h.avg_score === null ? 4 : Math.max(8, (h.avg_score / 2) * 100)
          const isNow = h.hour === currentHour
          return (
            <div
              key={h.hour}
              className="group relative flex h-full flex-1 items-end"
              title={
                h.report_count
                  ? `${hourLabel(h.hour)}: ${h.report_count} report${h.report_count === 1 ? '' : 's'}, avg ${h.avg_score}/2`
                  : `${hourLabel(h.hour)}: no reports`
              }
            >
              <div
                className={`w-full rounded-t-sm transition-all ${isNow ? 'ring-2 ring-sbu ring-offset-1' : ''}`}
                style={{
                  height: `${pct}%`,
                  backgroundColor: h.avg_score === null ? '#e5e7eb' : scoreColor(h.avg_score),
                  opacity: isNow ? 1 : 0.75,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-0.5 text-[10px] text-gray-400">
        {hours.map((h) => (
          <span key={h.hour} className="flex-1 text-center">
            {h.hour % 3 === 0 ? hourLabel(h.hour) : ''}
          </span>
        ))}
      </div>
      {!hasData && <p className="mt-2 text-xs text-gray-500">Not enough reports yet. Check back after a few days of use.</p>}
    </div>
  )
}
