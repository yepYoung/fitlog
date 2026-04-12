import { CARDIO_PARAMS } from '../utils/constants'
import Timer from './Timer'

interface CardioFormProps {
  exerciseType: string
  commonCardio: string[]
  onExerciseTypeChange: (type: string) => void
  durationMin: string
  onDurationChange: (val: string) => void
  cardioParams: Record<string, string>
  onCardioParamChange: (key: string, val: string) => void
  showTimer: boolean
  onToggleTimer: () => void
  onTimerSave: (minutes: number) => void
  errorField?: string | null
}

export default function CardioForm({ exerciseType, commonCardio, onExerciseTypeChange, durationMin, onDurationChange, cardioParams, onCardioParamChange, showTimer, onToggleTimer, onTimerSave, errorField }: CardioFormProps) {
  const paramDefs = CARDIO_PARAMS[exerciseType] || []

  return (
    <>
      {/* Cardio presets */}
      {commonCardio.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {commonCardio.map((ex) => (
            <button key={ex} onClick={() => onExerciseTypeChange(ex)}
              className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
              style={exerciseType === ex
                ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
                : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
              }>{ex}</button>
          ))}
        </div>
      )}

      {/* Timer toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-theme-secondary">运动时长</label>
          <button onClick={onToggleTimer}
            className="text-xs px-3 py-1 rounded-full transition-all duration-200"
            style={showTimer
              ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
              : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
            }>
            {showTimer ? '关闭计时器' : '⏱ 计时器'}
          </button>
        </div>
        {showTimer ? (
          <Timer onSave={onTimerSave} />
        ) : (
          <div className="relative">
            <input type="number" inputMode="numeric" value={durationMin}
              onChange={(e) => onDurationChange(e.target.value)}
              placeholder="0" className={`input-field pr-14 ${errorField === 'duration' ? 'field-error' : ''}`} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-theme-tertiary">分钟</span>
          </div>
        )}
      </div>

      {/* Cardio params */}
      {paramDefs.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block text-theme-secondary">运动参数</label>
          <div className="grid grid-cols-2 gap-2">
            {paramDefs.map((p) => (
              <div key={p.key} className="relative">
                <input type="number" inputMode="decimal"
                  value={cardioParams[p.key] ?? ''}
                  onChange={(e) => onCardioParamChange(p.key, e.target.value)}
                  placeholder={p.label} className="input-field pr-12 text-sm" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-tertiary">{p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
