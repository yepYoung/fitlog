import type { StrengthGroup } from '../types'
import type { LastStrengthSnapshot } from '../utils/exercise'
import { formatStrengthSets, getMaxStrengthWeight } from '../utils/exercise'
import { formatRelativeDate } from '../utils/constants'

interface StrengthFormProps {
  sets: Array<{ weight: string; reps: string }>
  onSetsChange: (sets: Array<{ weight: string; reps: string }>) => void
  strengthGroups: StrengthGroup[]
  exerciseType: string
  onExerciseTypeChange: (type: string) => void
  errorField?: string | null
  lastStrength?: LastStrengthSnapshot | null
  canCopyLast?: boolean
  onCopyLast?: () => void
}

export default function StrengthForm({ sets, onSetsChange, strengthGroups, exerciseType, onExerciseTypeChange, errorField, lastStrength, canCopyLast, onCopyLast }: StrengthFormProps) {
  function addSet() {
    onSetsChange([...sets, { weight: '', reps: '' }])
  }
  function removeSet(i: number) {
    if (sets.length > 1) onSetsChange(sets.filter((_, idx) => idx !== i))
  }
  function updateSet(i: number, field: string, val: string) {
    onSetsChange(sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  return (
    <>
      {/* Exercise Type with grouped presets */}
      <div className="mt-3 space-y-3">
        {strengthGroups.map((g) => (
          <div key={g.group}>
            <span className="text-xs font-medium mb-1.5 block text-theme-tertiary">{g.group}</span>
            <div className="flex flex-wrap gap-2">
              {g.items.map((ex) => (
                <button key={ex} onClick={() => onExerciseTypeChange(ex)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                  style={exerciseType === ex
                    ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
                    : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
                  }>{ex}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Last time hint */}
      {lastStrength && (
        <div
          className="mt-4 p-3 rounded-2xl"
          style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-theme-secondary">
              上次「{exerciseType}」 · {formatRelativeDate(lastStrength.date)}
            </span>
            <span className="text-xs text-theme-tertiary">
              最重 {getMaxStrengthWeight(lastStrength.sets)}kg · {lastStrength.sets.length} 组
            </span>
          </div>
          <div className="text-sm text-theme-primary mb-2 break-words">
            {formatStrengthSets(lastStrength.sets)}
          </div>
          {canCopyLast && onCopyLast && (
            <button
              onClick={onCopyLast}
              className="w-full py-2 rounded-xl text-xs font-medium transition-all duration-200"
              style={{ background: 'rgba(96,165,250,0.18)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }}
            >
              复制为本次组数
            </button>
          )}
        </div>
      )}

      {/* Sets */}
      <div>
        <label className="text-sm font-medium mb-2 block text-theme-secondary">组数记录</label>
        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-8 text-center shrink-0 text-theme-tertiary">#{i + 1}</span>
              <div className="relative flex-1">
                <input type="number" inputMode="decimal" value={s.weight}
                  onChange={(e) => updateSet(i, 'weight', e.target.value)}
                  placeholder="重量" className={`input-field pr-10 text-center ${i === 0 && errorField === 'sets' ? 'field-error' : ''}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-tertiary">kg</span>
              </div>
              <span className="text-theme-tertiary">×</span>
              <div className="relative flex-1">
                <input type="number" inputMode="numeric" value={s.reps}
                  onChange={(e) => updateSet(i, 'reps', e.target.value)}
                  placeholder="次数" className="input-field text-center" />
              </div>
              {sets.length > 1 && (
                <button onClick={() => removeSet(i)} className="p-2 shrink-0 text-theme-red">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addSet} className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ background: 'var(--chip-bg)', color: 'var(--text-accent)', border: '1px dashed var(--chip-border)' }}>
          + 添加一组
        </button>
      </div>
    </>
  )
}
