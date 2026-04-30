import { describe, expect, it } from 'vitest'
import { filterCyclingPoint, routeDistanceKm } from '../utils/cycling'
import type { GPSPoint } from '../types'

function point(lat: number, lng: number, timestamp: number, accuracy = 8): GPSPoint {
  return {
    lat,
    lng,
    timestamp,
    accuracy,
    altitude: null,
    speed: null,
  }
}

describe('cycling track filter', () => {
  it('rejects low accuracy points', () => {
    const decision = filterCyclingPoint([], point(31.2304, 121.4737, 1000, 90))

    expect(decision.accepted).toBe(false)
    expect(decision.reason).toBe('low_accuracy')
  })

  it('rejects small stationary drift', () => {
    const first = point(31.2304, 121.4737, 1000)
    const next = point(31.23045, 121.47375, 9000)
    const decision = filterCyclingPoint([first], next)

    expect(decision.accepted).toBe(false)
    expect(decision.reason).toBe('stationary_drift')
  })

  it('rejects unrealistic speed jumps', () => {
    const first = point(31.2304, 121.4737, 1000)
    const next = point(31.233, 121.476, 6000)
    const decision = filterCyclingPoint([first], next)

    expect(decision.accepted).toBe(false)
    expect(decision.reason).toBe('speed_spike')
  })

  it('accepts plausible cycling movement', () => {
    const first = point(31.2304, 121.4737, 1000)
    const next = point(31.23075, 121.47405, 11000)
    const decision = filterCyclingPoint([first], next)

    expect(decision.accepted).toBe(true)
    expect(decision.point).toBeDefined()
  })

  it('calculates route distance with geolib', () => {
    const distance = routeDistanceKm([
      point(31.2304, 121.4737, 1000),
      point(31.23075, 121.47405, 11000),
    ])

    expect(distance).toBeGreaterThan(0.04)
    expect(distance).toBeLessThan(0.07)
  })
})
