// The campus map (Leaflet with OpenStreetMap tiles, free and no API key).
//
// Each spot is a colored circle (green / amber / red / gray by status) with a
// faint ring showing the 100 m reporting radius. You are the blue dot.
// Circles are used instead of pin icons, which avoids Leaflet's default
// marker images (they break with bundlers like Vite).

import { Fragment } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import { REPORT_RADIUS_M } from '../lib/geo'
import { STATUS_STYLE } from '../lib/status'
import type { Coords, Spot } from '../types'

const CAMPUS_CENTER: [number, number] = [40.9157, -73.1218]

interface Props {
  spots: Spot[]
  me: Coords | null
  selectedId: number | null
  onSelect: (id: number) => void
}

export function CampusMap({ spots, me, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={CAMPUS_CENTER} zoom={17} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {spots.map((spot) => {
        const color = STATUS_STYLE[spot.status].color
        const selected = spot.id === selectedId
        return (
          <Fragment key={spot.id}>
            <Circle
              center={[spot.lat, spot.lon]}
              radius={REPORT_RADIUS_M}
              pathOptions={{ color, weight: 1, opacity: 0.4, fillOpacity: 0.06, dashArray: '4 4' }}
              interactive={false}
            />
            <CircleMarker
              center={[spot.lat, spot.lon]}
              radius={selected ? 13 : 10}
              pathOptions={{ color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{ click: () => onSelect(spot.id) }}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent={selected}>
                <strong>{spot.name}</strong> · {STATUS_STYLE[spot.status].label}
              </Tooltip>
            </CircleMarker>
          </Fragment>
        )
      })}

      {me && (
        <CircleMarker
          center={[me.lat, me.lon]}
          radius={8}
          pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
        >
          <Tooltip direction="bottom" offset={[0, 8]}>
            You
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
