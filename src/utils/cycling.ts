import { getDistance, getPathLength } from 'geolib'
import type { GPSPoint } from '../types'

const MAX_FIRST_POINT_ACCURACY_M = 55
const MAX_TRACK_ACCURACY_M = 35
const MIN_SECONDS_BETWEEN_POINTS = 1.2
const MIN_MOVING_DISTANCE_M = 12
const MAX_STILL_DRIFT_DISTANCE_M = 18
const STILL_DRIFT_SPEED_KMH = 4
const MAX_CYCLING_SPEED_KMH = 58
const MAX_ACCELERATION_MPS2 = 4.5
const SMOOTHING_GAIN = 0.36

export type TrackRejectReason =
  | 'low_accuracy'
  | 'duplicate'
  | 'stationary_drift'
  | 'speed_spike'
  | 'acceleration_spike'
  | 'zigzag_drift'

export interface TrackPointDecision {
  accepted: boolean
  point?: GPSPoint
  reason?: TrackRejectReason
}

function toGeoPoint(point: GPSPoint) {
  return {
    latitude: point.lat,
    longitude: point.lng,
  }
}

export function distanceMeters(a: GPSPoint, b: GPSPoint): number {
  return getDistance(toGeoPoint(a), toGeoPoint(b), 0.01)
}

export function routeDistanceKm(points: GPSPoint[]): number {
  if (points.length < 2) return 0
  const meters = getPathLength(points.map(toGeoPoint), (a, b) => getDistance(a, b, 0.01))
  return meters / 1000
}

export function routeAscentM(points: GPSPoint[]): number {
  if (points.length < 2) return 0
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index]
    if (previous.altitude == null || point.altitude == null) return sum
    const gain = point.altitude - previous.altitude
    return gain > 1 ? sum + gain : sum
  }, 0)
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`
}

export function formatPaceSpeed(distanceKm: number, durationSec: number): string {
  if (distanceKm <= 0 || durationSec <= 0) return '0.0 km/h'
  return `${(distanceKm / (durationSec / 3600)).toFixed(1)} km/h`
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function computedSpeedMps(previous: GPSPoint, next: GPSPoint): number {
  const seconds = Math.max((next.timestamp - previous.timestamp) / 1000, 0.1)
  return distanceMeters(previous, next) / seconds
}

function smoothPoint(previous: GPSPoint, next: GPSPoint): GPSPoint {
  const previousAccuracy = previous.accuracy ?? MAX_TRACK_ACCURACY_M
  const nextAccuracy = next.accuracy ?? MAX_TRACK_ACCURACY_M
  const gain = nextAccuracy <= previousAccuracy ? SMOOTHING_GAIN + 0.12 : SMOOTHING_GAIN
  const lat = previous.lat + (next.lat - previous.lat) * gain
  const lng = previous.lng + (next.lng - previous.lng) * gain
  const smoothed: GPSPoint = {
    ...next,
    lat,
    lng,
  }
  smoothed.speed = computedSpeedMps(previous, smoothed)
  return smoothed
}

export function filterCyclingPoint(points: GPSPoint[], next: GPSPoint): TrackPointDecision {
  const maxAccuracy = points.length === 0 ? MAX_FIRST_POINT_ACCURACY_M : MAX_TRACK_ACCURACY_M
  if (next.accuracy != null && next.accuracy > maxAccuracy) {
    return { accepted: false, reason: 'low_accuracy' }
  }

  const previous = points[points.length - 1]
  if (!previous) {
    return { accepted: true, point: { ...next, speed: 0 } }
  }

  const seconds = (next.timestamp - previous.timestamp) / 1000
  if (seconds < MIN_SECONDS_BETWEEN_POINTS) {
    return { accepted: false, reason: 'duplicate' }
  }

  const meters = distanceMeters(previous, next)
  const speedMps = meters / Math.max(seconds, 0.1)
  const speedKmh = speedMps * 3.6
  const combinedAccuracy = (previous.accuracy ?? 12) + (next.accuracy ?? 12)

  if (meters < MIN_MOVING_DISTANCE_M) {
    return { accepted: false, reason: 'stationary_drift' }
  }

  if (meters < MAX_STILL_DRIFT_DISTANCE_M && speedKmh < STILL_DRIFT_SPEED_KMH) {
    return { accepted: false, reason: 'stationary_drift' }
  }

  if (speedKmh > MAX_CYCLING_SPEED_KMH) {
    return { accepted: false, reason: 'speed_spike' }
  }

  if (points.length >= 2) {
    const beforePrevious = points[points.length - 2]
    const previousSeconds = Math.max((previous.timestamp - beforePrevious.timestamp) / 1000, 0.1)
    const previousSpeedMps = distanceMeters(beforePrevious, previous) / previousSeconds
    const acceleration = Math.abs(speedMps - previousSpeedMps) / Math.max(seconds, 0.1)
    const backtrackMeters = distanceMeters(beforePrevious, next)

    if (speedKmh > 12 && acceleration > MAX_ACCELERATION_MPS2) {
      return { accepted: false, reason: 'acceleration_spike' }
    }

    if (meters < combinedAccuracy && backtrackMeters < meters * 0.55) {
      return { accepted: false, reason: 'zigzag_drift' }
    }
  }

  return {
    accepted: true,
    point: smoothPoint(previous, next),
  }
}

export function shouldKeepPoint(points: GPSPoint[], next: GPSPoint): boolean {
  return filterCyclingPoint(points, next).accepted
}
