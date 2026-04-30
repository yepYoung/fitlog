import { useEffect, useMemo, useRef, useState } from 'react'
import useStore from '../store/useStore'
import PageBackground from '../components/PageBackground'
import RouteMap from '../components/RouteMap'
import { formatDate } from '../utils/constants'
import { filterCyclingPoint, formatDistance, formatDuration, formatPaceSpeed, routeAscentM, routeDistanceKm } from '../utils/cycling'
import type { ExerciseRecord, GPSPoint } from '../types'

type RideStatus = 'idle' | 'acquiring' | 'recording' | 'paused' | 'error'

function pointFromPosition(position: GeolocationPosition): GPSPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    altitude: position.coords.altitude ?? null,
    speed: position.coords.speed ?? null,
    timestamp: position.timestamp,
  }
}

function statusLabel(status: RideStatus): string {
  if (status === 'recording') return '记录中'
  if (status === 'paused') return '已暂停'
  if (status === 'acquiring') return '定位中'
  if (status === 'error') return '定位异常'
  return '准备骑行'
}

export default function Cycling() {
  const addRecord = useStore((s) => s.addRecord)
  const records = useStore((s) => s.records)
  const showToast = useStore((s) => s.showToast)

  const [status, setStatus] = useState<RideStatus>('acquiring')
  const [points, setPoints] = useState<GPSPoint[]>([])
  const [currentPoint, setCurrentPoint] = useState<GPSPoint | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const statusRef = useRef<RideStatus>('idle')
  const watchIdRef = useRef<number | null>(null)
  const activeStartedAtRef = useRef<number | null>(null)
  const accumulatedSecRef = useRef(0)
  const rideStartedAtRef = useRef<string | null>(null)
  const pendingStartRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    startLocationPreview()

    const timer = window.setInterval(() => {
      if (statusRef.current !== 'recording' || activeStartedAtRef.current == null) return
      setElapsedSec(accumulatedSecRef.current + Math.floor((Date.now() - activeStartedAtRef.current) / 1000))
    }, 1000)

    return () => {
      window.clearInterval(timer)
      stopLocationWatch()
    }
  }, [])

  const metrics = useMemo(() => {
    const distanceKm = routeDistanceKm(points)
    const ascentM = routeAscentM(points)
    const avgSpeed = formatPaceSpeed(distanceKm, elapsedSec)
    const rawMaxSpeed = Math.max(0, ...points.map((point) => point.speed ?? 0)) * 3.6
    const maxSpeed = rawMaxSpeed > 0 ? rawMaxSpeed : distanceKm > 0 && elapsedSec > 0 ? distanceKm / (elapsedSec / 3600) : 0
    return { distanceKm, ascentM, avgSpeed, maxSpeed }
  }, [points, elapsedSec])

  const recentRides = useMemo(() => {
    return records
      .filter((record): record is ExerciseRecord => record.type === 'exercise' && record.exerciseType === '骑行' && !!record.cyclingRoute)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
  }, [records])

  function stopLocationWatch() {
    if (watchIdRef.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  function setRideStatus(nextStatus: RideStatus) {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  function getTotalElapsedSec() {
    if (statusRef.current === 'recording' && activeStartedAtRef.current != null) {
      return accumulatedSecRef.current + Math.floor((Date.now() - activeStartedAtRef.current) / 1000)
    }
    return accumulatedSecRef.current
  }

  function handlePosition(position: GeolocationPosition) {
    const point = pointFromPosition(position)
    setCurrentPoint(point)
    setError('')

    if (pendingStartRef.current) {
      pendingStartRef.current = false
      beginRecording(point)
      return
    }

    if (statusRef.current === 'acquiring') {
      setRideStatus('idle')
    }

    if (statusRef.current !== 'recording') return

    addTrackPoint(point)
  }

  function handleLocationError(locationError: GeolocationPositionError) {
    stopLocationWatch()
    activeStartedAtRef.current = null
    pendingStartRef.current = false
    setRideStatus('error')
    const message = locationError.code === locationError.PERMISSION_DENIED
      ? '请允许浏览器访问定位'
      : locationError.code === locationError.POSITION_UNAVAILABLE
        ? '暂时无法获取定位'
        : '定位请求超时'
    setError(message)
    showToast(message)
  }

  function startLocationPreview() {
    if (!('geolocation' in navigator)) {
      setError('当前浏览器不支持定位')
      setRideStatus('error')
      showToast('当前浏览器不支持定位')
      return
    }

    if (watchIdRef.current != null) return

    setError('')
    if (!currentPoint && statusRef.current !== 'recording' && statusRef.current !== 'paused') {
      setRideStatus('acquiring')
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleLocationError, options)
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleLocationError, options)
  }

  function beginRecording(firstPoint: GPSPoint) {
    activeStartedAtRef.current = Date.now()
    setRideStatus('recording')
    addTrackPoint(firstPoint)
  }

  function addTrackPoint(point: GPSPoint) {
    setPoints((previous) => {
      const decision = filterCyclingPoint(previous, point)
      if (!decision.accepted || !decision.point) return previous
      return [...previous, decision.point]
    })
  }

  function startRide() {
    rideStartedAtRef.current = new Date().toISOString()
    accumulatedSecRef.current = 0
    activeStartedAtRef.current = null
    setElapsedSec(0)
    setPoints([])
    pendingStartRef.current = true
    startLocationPreview()

    if (currentPoint) {
      pendingStartRef.current = false
      beginRecording(currentPoint)
    } else {
      setRideStatus('acquiring')
    }
  }

  function pauseRide() {
    const total = getTotalElapsedSec()
    accumulatedSecRef.current = total
    activeStartedAtRef.current = null
    setElapsedSec(total)
    setRideStatus('paused')
  }

  function resumeRide() {
    pendingStartRef.current = true
    startLocationPreview()

    if (currentPoint) {
      pendingStartRef.current = false
      beginRecording(currentPoint)
    } else {
      setRideStatus('acquiring')
    }
  }

  function discardRide() {
    accumulatedSecRef.current = 0
    activeStartedAtRef.current = null
    rideStartedAtRef.current = null
    pendingStartRef.current = false
    setElapsedSec(0)
    setPoints([])
    setNote('')
    setError('')
    setRideStatus(currentPoint ? 'idle' : 'acquiring')
    startLocationPreview()
  }

  function finishRide() {
    const total = getTotalElapsedSec()
    accumulatedSecRef.current = total
    activeStartedAtRef.current = null
    setElapsedSec(total)

    if (points.length < 2) {
      setRideStatus('paused')
      showToast('轨迹点太少，继续骑一小段再保存')
      return
    }

    const startedAt = rideStartedAtRef.current ?? new Date().toISOString()
    const endedAt = new Date().toISOString()
    const start = new Date(startedAt)
    const date = formatDate(start)
    const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    const distanceKm = Number(metrics.distanceKm.toFixed(3))
    const durationSec = Math.max(total, 1)
    const avgSpeed = Number((distanceKm / (durationSec / 3600)).toFixed(1))
    const maxSpeed = Number(metrics.maxSpeed.toFixed(1))
    const ascentM = Math.round(metrics.ascentM)

    addRecord({
      type: 'exercise',
      exerciseCategory: 'cardio',
      exerciseType: '骑行',
      date,
      time,
      durationMin: Math.max(1, Math.round(durationSec / 60)),
      cardioParams: {
        distance: distanceKm,
        speed: avgSpeed,
        maxSpeed,
        ascent: ascentM,
      },
      cyclingRoute: {
        points,
        distanceKm,
        durationSec,
        startedAt,
        endedAt,
        ascentM,
      },
      note: note.trim() || null,
    })

    showToast('骑行已保存')
    discardRide()
  }

  return (
    <>
      <PageBackground src="/bg-stats.png" scrimFrom={0.18} scrimTo={0.55} />
      <div className="px-4 pt-12 safe-top pb-24">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">骑行地图</h1>
            <p className="mt-1 text-sm text-theme-tertiary">{statusLabel(status)}</p>
          </div>
          <div className="rounded-full px-3 py-1 text-xs"
            style={{ background: 'rgba(52,211,153,0.16)', color: 'var(--text-green)', border: '1px solid rgba(52,211,153,0.2)' }}>
            GPS
          </div>
        </div>

        <RouteMap points={points} currentPoint={currentPoint} recording={status === 'recording'} locating={status === 'acquiring'} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="glass p-4">
            <div className="text-xs text-theme-tertiary">距离</div>
            <div className="mt-1 text-2xl font-bold font-display">{formatDistance(metrics.distanceKm)}</div>
          </div>
          <div className="glass p-4">
            <div className="text-xs text-theme-tertiary">时间</div>
            <div className="mt-1 text-2xl font-bold font-display">{formatDuration(elapsedSec)}</div>
          </div>
          <div className="glass p-4">
            <div className="text-xs text-theme-tertiary">均速</div>
            <div className="mt-1 text-2xl font-bold font-display">{metrics.avgSpeed}</div>
          </div>
          <div className="glass p-4">
            <div className="text-xs text-theme-tertiary">爬升</div>
            <div className="mt-1 text-2xl font-bold font-display">{Math.round(metrics.ascentM)} m</div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[16px] px-4 py-3 text-sm"
            style={{ background: 'rgba(248,113,113,0.12)', color: 'var(--text-red)', border: '1px solid rgba(248,113,113,0.18)' }}>
            {error}
          </div>
        )}

        {(status === 'recording' || status === 'paused') && (
          <div className="mt-4">
            <input type="text" value={note} onChange={(event) => setNote(event.target.value)}
              placeholder="备注：路线、体感、天气..." className="input-field" />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {status === 'idle' || status === 'error' ? (
            <button onClick={startRide} className="btn-primary col-span-2">开始骑行</button>
          ) : status === 'acquiring' ? (
            <button className="btn-secondary col-span-2" disabled>正在定位...</button>
          ) : status === 'recording' ? (
            <>
              <button onClick={pauseRide} className="btn-secondary">暂停</button>
              <button onClick={finishRide} className="btn-primary">结束并保存</button>
            </>
          ) : (
            <>
              <button onClick={resumeRide} className="btn-primary">继续</button>
              <button onClick={finishRide} className="btn-secondary">保存</button>
              <button onClick={discardRide} className="btn-danger col-span-2">放弃本次骑行</button>
            </>
          )}
        </div>

        {recentRides.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-base font-semibold text-theme-secondary">最近骑行</h2>
            <div className="glass overflow-hidden divide-y border-glass-divider">
              {recentRides.map((ride) => (
                <div key={ride.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{ride.date} {ride.time}</div>
                      <div className="mt-1 text-xs text-theme-tertiary">
                        {formatDistance(ride.cyclingRoute?.distanceKm ?? 0)} · {formatDuration(ride.cyclingRoute?.durationSec ?? 0)} · {formatPaceSpeed(ride.cyclingRoute?.distanceKm ?? 0, ride.cyclingRoute?.durationSec ?? 0)}
                      </div>
                    </div>
                    <div className="text-xs text-theme-tertiary">{ride.cyclingRoute?.points.length ?? 0} 点</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
