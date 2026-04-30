import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GPSPoint } from '../types'

interface RouteMapProps {
  points: GPSPoint[]
  currentPoint?: GPSPoint | null
  recording?: boolean
  locating?: boolean
}

const DEFAULT_CENTER: L.LatLngExpression = [39.9042, 116.4074]
const DEFAULT_ZOOM = 13
const LOCATION_ZOOM = 16
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

function toLatLng(point: GPSPoint): L.LatLngExpression {
  return [point.lat, point.lng]
}

function createCurrentIcon(recording: boolean) {
  return L.divIcon({
    className: recording ? 'cycling-current-marker is-recording' : 'cycling-current-marker',
    html: '<span></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

function createPinIcon(kind: 'start' | 'finish') {
  return L.divIcon({
    className: `cycling-route-pin cycling-route-pin--${kind}`,
    html: kind === 'start' ? '起' : '终',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function RouteMap({ points, currentPoint, recording = false, locating = false }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeRef = useRef<L.Polyline | null>(null)
  const currentMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)
  const startMarkerRef = useRef<L.Marker | null>(null)
  const finishMarkerRef = useRef<L.Marker | null>(null)
  const centeredRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !currentPoint) return

    const latLng = toLatLng(currentPoint)

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = L.marker(latLng, {
        icon: createCurrentIcon(recording),
        interactive: false,
        keyboard: false,
      }).addTo(map)
    } else {
      currentMarkerRef.current.setLatLng(latLng)
      currentMarkerRef.current.setIcon(createCurrentIcon(recording))
    }

    if (currentPoint.accuracy != null) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(latLng, {
          radius: currentPoint.accuracy,
          stroke: false,
          fillColor: '#3B82F6',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map)
      } else {
        accuracyCircleRef.current.setLatLng(latLng)
        accuracyCircleRef.current.setRadius(currentPoint.accuracy)
      }
    }

    if (!centeredRef.current) {
      map.setView(latLng, LOCATION_ZOOM, { animate: true })
      centeredRef.current = true
    } else if (recording) {
      map.panTo(latLng, { animate: true })
    }
  }, [currentPoint, recording])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const latLngs = points.map(toLatLng)

    if (!routeRef.current) {
      routeRef.current = L.polyline(latLngs, {
        color: '#10B981',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
    } else {
      routeRef.current.setLatLngs(latLngs)
    }

    if (startMarkerRef.current) {
      startMarkerRef.current.remove()
      startMarkerRef.current = null
    }
    if (finishMarkerRef.current) {
      finishMarkerRef.current.remove()
      finishMarkerRef.current = null
    }

    if (points.length > 0) {
      startMarkerRef.current = L.marker(toLatLng(points[0]), {
        icon: createPinIcon('start'),
        interactive: false,
        keyboard: false,
      }).addTo(map)
    }

    if (points.length > 1 && !recording) {
      finishMarkerRef.current = L.marker(toLatLng(points[points.length - 1]), {
        icon: createPinIcon('finish'),
        interactive: false,
        keyboard: false,
      }).addTo(map)
    }
  }, [points, recording])

  return (
    <div className="relative h-[430px] overflow-hidden rounded-[22px] glass cycling-map-shell">
      <div ref={containerRef} className="cycling-map h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 right-4 flex items-start justify-between gap-3">
        <div className="rounded-2xl px-3 py-2 cycling-map-badge">
          <div className="text-xs text-theme-tertiary">附近地图</div>
          <div className="mt-1 text-sm font-medium text-theme-primary">
            {currentPoint ? `精度 ${Math.round(currentPoint.accuracy ?? 0)} m` : locating ? '正在定位' : '等待定位权限'}
          </div>
        </div>
        <div className="rounded-full px-3 py-1 text-xs cycling-map-badge"
          style={{ color: recording ? 'var(--text-green)' : 'var(--text-secondary)' }}>
          {recording ? '记录中' : '地图就绪'}
        </div>
      </div>
    </div>
  )
}
