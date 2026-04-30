import type { GPSPoint } from '../types'

const EARTH_RADIUS_M = 6371000

export function toRadians(value: number): number {
  return value * Math.PI / 180
}

export function distanceMeters(a: GPSPoint, b: GPSPoint): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function routeDistanceKm(points: GPSPoint[]): number {
  if (points.length < 2) return 0
  const meters = points.slice(1).reduce((sum, point, index) => sum + distanceMeters(points[index], point), 0)
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

export function shouldKeepPoint(points: GPSPoint[], next: GPSPoint): boolean {
  if (next.accuracy != null && next.accuracy > 70) return false
  const previous = points[points.length - 1]
  if (!previous) return true

  const seconds = Math.max((next.timestamp - previous.timestamp) / 1000, 1)
  const meters = distanceMeters(previous, next)
  const speedKmh = meters / seconds * 3.6

  if (meters < 3 && seconds < 8) return false
  if (speedKmh > 70) return false
  return true
}
