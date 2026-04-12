import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import { formatTimer } from '../utils/constants'

interface TimerProps {
  onSave: (minutes: number) => void
}

export default function Timer({ onSave }: TimerProps) {
  const timer = useStore((s) => s.timer)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)

  const [elapsed, setElapsed] = useState(() =>
    timer.running && timer.startedAt
      ? timer.base + Math.floor((Date.now() - timer.startedAt) / 1000)
      : timer.base
  )
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
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
  }, [timer.running, timer.startedAt, timer.base])

  function handleReset() {
    resetTimer()
  }

  function handleSave() {
    const minutes = Math.round(elapsed / 60)
    onSave(minutes > 0 ? minutes : 1)
    resetTimer()
  }

  return (
    <div className="glass p-5 text-center">
      {/* Timer Display */}
      <div className="text-5xl font-bold tracking-wider mb-5 font-mono" style={{ color: timer.running ? 'var(--text-accent)' : 'var(--text-primary)' }}>
        {formatTimer(elapsed)}
      </div>

      <div className="flex gap-3 justify-center">
        {/* Start / Pause */}
        <button
          onClick={() => timer.running ? pauseTimer() : startTimer()}
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
          style={{
            background: timer.running
              ? 'rgba(251,191,36,0.15)'
              : 'linear-gradient(135deg, #60A5FA, #818CF8)',
            border: timer.running ? '1px solid rgba(251,191,36,0.3)' : 'none',
          }}
        >
          {timer.running ? (
            <svg viewBox="0 0 24 24" fill="var(--text-yellow)" className="w-6 h-6">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* Reset */}
        {elapsed > 0 && (
          <button
            onClick={handleReset}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
            style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="var(--text-secondary)" strokeWidth={2}>
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Save */}
        {elapsed > 0 && !timer.running && (
          <button
            onClick={handleSave}
            className="h-14 px-5 rounded-2xl flex items-center gap-2 font-medium transition-all duration-200"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--text-green)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            保存 {Math.round(elapsed / 60)} 分钟
          </button>
        )}
      </div>
    </div>
  )
}
