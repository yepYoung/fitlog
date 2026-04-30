import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type LngLatLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GPSPoint } from '../types'

interface RouteMapProps {
  points: GPSPoint[]
  currentPoint?: GPSPoint | null
  recording?: boolean
  locating?: boolean
}

const DEFAULT_CENTER: LngLatLike = [116.4074, 39.9042]
const DEFAULT_ZOOM = 12.5
const LOCATION_ZOOM = 16
const LIGHT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const DARK_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/fiord'

type GeoJSONFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>

function coords(point: GPSPoint): [number, number] {
  return [point.lng, point.lat]
}

function getMapStyleUrl(): string {
  if (import.meta.env.VITE_MAP_STYLE_URL) return import.meta.env.VITE_MAP_STYLE_URL
  return document.documentElement.dataset.theme === 'dark' ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL
}

function emptyFeatureCollection(): GeoJSONFeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function pointFeature(point: GPSPoint | null, recording: boolean): GeoJSONFeatureCollection {
  if (!point) return emptyFeatureCollection()
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        recording,
      },
      geometry: {
        type: 'Point',
        coordinates: coords(point),
      },
    }],
  }
}

function routeFeature(points: GPSPoint[]): GeoJSONFeatureCollection {
  if (points.length < 2) return emptyFeatureCollection()
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map(coords),
      },
    }],
  }
}

function endpointFeatures(points: GPSPoint[]): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  if (points.length > 0) {
    features.push({
      type: 'Feature',
      properties: { kind: 'start', label: '起' },
      geometry: { type: 'Point', coordinates: coords(points[0]) },
    })
  }
  if (points.length > 1) {
    features.push({
      type: 'Feature',
      properties: { kind: 'finish', label: '终' },
      geometry: { type: 'Point', coordinates: coords(points[points.length - 1]) },
    })
  }
  return { type: 'FeatureCollection', features }
}

function accuracyFeature(point: GPSPoint | null): GeoJSONFeatureCollection {
  if (!point || !point.accuracy) return emptyFeatureCollection()

  const radius = Math.min(Math.max(point.accuracy, 8), 120)
  const latRadius = radius / 111320
  const lngRadius = radius / (111320 * Math.cos(point.lat * Math.PI / 180))
  const coordinates: [number, number][] = []

  for (let i = 0; i <= 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2
    coordinates.push([
      point.lng + Math.cos(angle) * lngRadius,
      point.lat + Math.sin(angle) * latRadius,
    ])
  }

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    }],
  }
}

function getSource(map: maplibregl.Map, id: string): GeoJSONSource | undefined {
  return map.getSource(id) as GeoJSONSource | undefined
}

function setSourceData(map: maplibregl.Map, id: string, data: GeoJSONFeatureCollection) {
  getSource(map, id)?.setData(data)
}

function addModernMapLayers(map: maplibregl.Map) {
  map.addSource('accuracy', { type: 'geojson', data: emptyFeatureCollection() })
  map.addSource('route', { type: 'geojson', data: emptyFeatureCollection() })
  map.addSource('current-location', { type: 'geojson', data: emptyFeatureCollection() })
  map.addSource('route-endpoints', { type: 'geojson', data: emptyFeatureCollection() })

  map.addLayer({
    id: 'accuracy-fill',
    type: 'fill',
    source: 'accuracy',
    paint: {
      'fill-color': '#3B82F6',
      'fill-opacity': 0.12,
    },
  })

  map.addLayer({
    id: 'route-shadow',
    type: 'line',
    source: 'route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': 'rgba(3, 7, 18, 0.26)',
      'line-width': 10,
      'line-blur': 2.2,
    },
  })

  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#10B981',
      'line-width': 5,
      'line-opacity': 0.98,
    },
  })

  map.addLayer({
    id: 'current-pulse',
    type: 'circle',
    source: 'current-location',
    paint: {
      'circle-radius': ['case', ['==', ['get', 'recording'], true], 18, 15],
      'circle-color': ['case', ['==', ['get', 'recording'], true], '#10B981', '#2563EB'],
      'circle-opacity': 0.16,
      'circle-blur': 0.15,
    },
  })

  map.addLayer({
    id: 'current-dot',
    type: 'circle',
    source: 'current-location',
    paint: {
      'circle-radius': ['case', ['==', ['get', 'recording'], true], 7.5, 6.8],
      'circle-color': ['case', ['==', ['get', 'recording'], true], '#10B981', '#2563EB'],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 3,
      'circle-opacity': 1,
    },
  })

  map.addLayer({
    id: 'endpoint-circles',
    type: 'circle',
    source: 'route-endpoints',
    paint: {
      'circle-radius': 11,
      'circle-color': ['case', ['==', ['get', 'kind'], 'start'], '#2563EB', '#10B981'],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 2,
    },
  })

  map.addLayer({
    id: 'endpoint-labels',
    type: 'symbol',
    source: 'route-endpoints',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 11,
      'text-font': ['Noto Sans Regular'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0, 0, 0, 0.18)',
      'text-halo-width': 0.6,
    },
  })
}

export default function RouteMap({ points, currentPoint, recording = false, locating = false }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const centeredRef = useRef(false)
  const currentPointRef = useRef<GPSPoint | null>(currentPoint ?? null)
  const pointsRef = useRef<GPSPoint[]>(points)
  const recordingRef = useRef(recording)

  function syncData() {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    setSourceData(map, 'accuracy', accuracyFeature(currentPointRef.current))
    setSourceData(map, 'current-location', pointFeature(currentPointRef.current, recordingRef.current))
    setSourceData(map, 'route', routeFeature(pointsRef.current))
    setSourceData(map, 'route-endpoints', endpointFeatures(pointsRef.current))
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 40,
      bearing: -10,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      addModernMapLayers(map)
      loadedRef.current = true
      syncData()
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  useEffect(() => {
    currentPointRef.current = currentPoint ?? null
    recordingRef.current = recording
    syncData()

    const map = mapRef.current
    if (!map || !currentPoint) return

    const center: LngLatLike = coords(currentPoint)
    if (!centeredRef.current) {
      map.flyTo({
        center,
        zoom: LOCATION_ZOOM,
        pitch: 46,
        bearing: -12,
        speed: 1.3,
        curve: 1.15,
        essential: true,
      })
      centeredRef.current = true
    } else if (recording) {
      map.easeTo({
        center,
        duration: 700,
        essential: true,
      })
    }
  }, [currentPoint, recording])

  useEffect(() => {
    pointsRef.current = points
    syncData()

    const map = mapRef.current
    if (!map || points.length < 2 || recording) return

    const lngs = points.map((point) => point.lng)
    const lats = points.map((point) => point.lat)
    const bounds: LngLatBoundsLike = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
    map.fitBounds(bounds, {
      padding: 64,
      pitch: 38,
      duration: 600,
    })
  }, [points, recording])

  return (
    <div className="relative h-[430px] overflow-hidden rounded-[22px] cycling-map-shell">
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
