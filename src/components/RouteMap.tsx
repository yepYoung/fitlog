import type { GPSPoint } from '../types'

interface RouteMapProps {
  points: GPSPoint[]
  currentPoint?: GPSPoint | null
  recording?: boolean
}

interface PlotPoint {
  x: number
  y: number
}

function projectPoints(points: GPSPoint[]): PlotPoint[] {
  if (points.length === 0) return []

  const lngs = points.map((p) => p.lng)
  const lats = points.map((p) => p.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngSpan = Math.max(maxLng - minLng, 0.0003)
  const latSpan = Math.max(maxLat - minLat, 0.0003)
  const padding = 12
  const size = 100 - padding * 2

  return points.map((point) => ({
    x: padding + ((point.lng - minLng) / lngSpan) * size,
    y: padding + (1 - ((point.lat - minLat) / latSpan)) * size,
  }))
}

export default function RouteMap({ points, currentPoint, recording = false }: RouteMapProps) {
  const displayPoints = points.length > 0 ? points : currentPoint ? [currentPoint] : []
  const projected = projectPoints(displayPoints)
  const line = projected.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
  const last = projected[projected.length - 1]
  const first = projected[0]

  return (
    <div className="relative h-[360px] overflow-hidden rounded-[22px]"
      style={{
        background:
          'linear-gradient(145deg, rgba(12,24,31,0.92), rgba(14,42,48,0.78)), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        border: '1px solid var(--glass-border-light)',
        boxShadow: 'var(--shadow-glass), var(--shadow-glass-inset)',
      }}>
      <div className="absolute inset-0 opacity-70"
        style={{
          background:
            'linear-gradient(115deg, transparent 0 34%, rgba(52,211,153,0.12) 34% 36%, transparent 36% 62%, rgba(96,165,250,0.12) 62% 64%, transparent 64%), radial-gradient(circle at 70% 18%, rgba(251,191,36,0.12), transparent 22%)',
        }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-5 78 C 18 64, 26 70, 42 54 S 72 44, 106 22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M-8 26 C 18 32, 35 26, 55 34 S 76 54, 108 48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.4" strokeLinecap="round" />
        {line && (
          <polyline points={line} fill="none" stroke="rgba(52,211,153,0.96)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
        {first && <circle cx={first.x} cy={first.y} r="1.6" fill="#60A5FA" vectorEffect="non-scaling-stroke" />}
        {last && (
          <>
            <circle cx={last.x} cy={last.y} r={recording ? '4.3' : '3.2'} fill="rgba(52,211,153,0.22)" vectorEffect="non-scaling-stroke" />
            <circle cx={last.x} cy={last.y} r="1.9" fill="#34D399" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      <div className="absolute left-4 top-4 right-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-theme-tertiary">GPS 地图</div>
          <div className="mt-1 text-sm font-medium text-white/90">
            {displayPoints.length > 0 ? `${displayPoints.length} 个定位点` : '等待定位'}
          </div>
        </div>
        <div className="rounded-full px-3 py-1 text-xs"
          style={{ background: recording ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.08)', color: recording ? '#34D399' : 'var(--text-secondary)' }}>
          {recording ? '记录中' : '就绪'}
        </div>
      </div>

      {currentPoint && (
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.28)', color: 'rgba(255,255,255,0.72)' }}>
            纬度 {currentPoint.lat.toFixed(5)}
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.28)', color: 'rgba(255,255,255,0.72)' }}>
            经度 {currentPoint.lng.toFixed(5)}
          </div>
        </div>
      )}
    </div>
  )
}
