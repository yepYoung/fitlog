import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useStore from '../store/useStore'
import { formatTimer } from '../utils/constants'

export default function FloatingTimer() {
  const timer = useStore((s) => s.timer)
  const navigate = useNavigate()
  const location = useLocation()

  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef<number | null>(null)

  const isActive = timer.running || timer.base > 0
  const isOnExercisePage = location.pathname === '/record/exercise'

  useEffect(() => {
    if (!isActive || isOnExercisePage) return

    if (timer.running && timer.startedAt) {
      const startedAt = timer.startedAt
      const base = timer.base
      const tick = () => {
        setElapsed(base + Math.floor((Date.now() - startedAt) / 1000))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      setElapsed(timer.base)
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [timer.running, timer.startedAt, timer.base, isActive, isOnExercisePage])

  if (!isActive || isOnExercisePage) return null

  return (
    <button
      onClick={() => navigate('/record/exercise')}
      className="fixed top-14 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 animate-slide-up"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(255,255,255,0.2)',
      }}
    >
      <span className={`w-2 h-2 rounded-full ${timer.running ? 'animate-pulse' : ''}`}
        style={{ background: timer.running ? 'var(--text-accent)' : 'var(--text-yellow)' }} />
      <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-accent)' }}>
        {formatTimer(elapsed)}
      </span>
      <span className="text-xs text-theme-tertiary">运动中</span>
    </button>
  )
}
