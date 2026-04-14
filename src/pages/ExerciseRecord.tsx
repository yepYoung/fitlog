import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useStore from '../store/useStore'
import { getToday, STRENGTH_GROUPS } from '../utils/constants'
import { getLastStrengthRecord } from '../utils/exercise'
import Timer from '../components/Timer'
import StrengthForm from '../components/StrengthForm'
import CardioForm from '../components/CardioForm'
import type { ExerciseRecord as ExerciseRecordType, StrengthSet } from '../types'

export default function ExerciseRecord() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const records = useStore((s) => s.records)
  const addRecord = useStore((s) => s.addRecord)
  const updateRecord = useStore((s) => s.updateRecord)
  const showToast = useStore((s) => s.showToast)
  const commonStrength = useStore((s) => s.settings.commonStrength)
  const commonCardio = useStore((s) => s.settings.commonCardio)

  const editRecord = editId ? records.find((r) => r.id === editId) as ExerciseRecordType | undefined : null
  const editExercise = editRecord ?? null

  const [category, setCategory] = useState(editExercise?.exerciseCategory ?? 'strength')
  const [exerciseType, setExerciseType] = useState(editExercise?.exerciseType ?? '')
  const [sets, setSets] = useState<Array<{ weight: string; reps: string }>>(
    editExercise?.sets?.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })) ?? [{ weight: '', reps: '' }]
  )
  const [durationMin, setDurationMin] = useState(editExercise?.durationMin?.toString() ?? '')
  const [cardioParams, setCardioParams] = useState<Record<string, string>>(
    editExercise?.cardioParams
      ? Object.fromEntries(Object.entries(editExercise.cardioParams).map(([k, v]) => [k, String(v)]))
      : {}
  )
  const [note, setNote] = useState(editExercise?.note ?? '')
  const globalTimer = useStore((s) => s.timer)
  const [showTimer, setShowTimer] = useState(globalTimer.running || globalTimer.base > 0)
  const [errorField, setErrorField] = useState<string | null>(null)

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const lastStrength = useMemo(
    () => (category === 'strength' ? getLastStrengthRecord(records, exerciseType, editId) : null),
    [records, category, exerciseType, editId],
  )

  const isSetsEmpty = sets.every((s) => !s.weight.trim() && !s.reps.trim())

  function copyLastStrength() {
    if (!lastStrength) return
    setSets(lastStrength.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })))
    showToast(`已复制上次「${exerciseType}」`)
  }

  function handleTimerSave(minutes: number) {
    setDurationMin(String(minutes))
    setShowTimer(false)
    showToast(`已记录 ${minutes} 分钟`)
  }

  function handleSave() {
    if (!exerciseType.trim()) {
      showToast('请选择运动类型')
      setErrorField('type')
      setTimeout(() => setErrorField(null), 1000)
      return
    }

    const common = {
      type: 'exercise' as const,
      exerciseCategory: category,
      exerciseType: exerciseType.trim(),
      date: editExercise?.date ?? getToday(),
      time: editExercise?.time ?? timeStr,
      note: note.trim() || null,
    }

    let data: Omit<ExerciseRecordType, 'id' | 'createdAt'>

    if (category === 'strength') {
      const validSets: StrengthSet[] = sets
        .filter((s) => s.weight || s.reps)
        .map((s) => ({
          weight: s.weight ? parseFloat(String(s.weight)) : 0,
          reps: s.reps ? parseInt(String(s.reps), 10) : 0,
        }))
      if (validSets.length === 0) {
        showToast('请至少记录一组')
        setErrorField('sets')
        setTimeout(() => setErrorField(null), 1000)
        return
      }
      data = {
        ...common,
        sets: validSets,
        ...(durationMin && parseInt(durationMin, 10) > 0 ? { durationMin: parseInt(durationMin, 10) } : {}),
      }
    } else {
      if (!durationMin || parseInt(durationMin, 10) <= 0) {
        showToast('请输入运动时长')
        setErrorField('duration')
        setTimeout(() => setErrorField(null), 1000)
        return
      }
      const cleanParams: Record<string, number> = {}
      Object.entries(cardioParams).forEach(([k, v]) => {
        if (v) cleanParams[k] = parseFloat(String(v))
      })
      data = {
        ...common,
        durationMin: parseInt(durationMin, 10),
        ...(Object.keys(cleanParams).length > 0 ? { cardioParams: cleanParams } : {}),
      }
    }

    if (editExercise && editId) { updateRecord(editId, data); showToast('已更新') }
    else { addRecord(data); showToast('已记录') }
    navigate(-1)
  }

  const strengthGroups = commonStrength?.length > 0 && typeof commonStrength[0] === 'object'
    ? commonStrength
    : STRENGTH_GROUPS

  return (
    <div className="min-h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 safe-top flex items-center justify-between"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: 'inset 0 -0.5px 0 var(--glass-border-light)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-theme-secondary">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{editExercise ? '编辑运动' : '记录运动'}</h1>
        <button onClick={handleSave} className="font-medium px-2 py-1 text-theme-accent">保存</button>
      </div>

      <div className="px-4 space-y-5 pb-10">
        {/* Category Toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--glass-input)', border: '1px solid var(--glass-border-light)' }}>
          {([{ key: 'strength', label: '💪 力量训练' }, { key: 'cardio', label: '🏃 有氧运动' }] as const).map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setExerciseType('') }}
              className="flex-1 py-3 text-sm font-medium transition-all duration-200"
              style={category === c.key
                ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }>{c.label}</button>
          ))}
        </div>

        {/* Exercise Type Input */}
        <div>
          <label className="text-sm font-medium mb-2 block text-theme-secondary">
            {category === 'strength' ? '动作名称' : '运动类型'}
          </label>
          <input type="text" value={exerciseType} onChange={(e) => setExerciseType(e.target.value)}
            placeholder={category === 'strength' ? '如：卧推、深蹲' : '如：跑步、椭圆机'}
            className={`input-field ${errorField === 'type' ? 'field-error' : ''}`} />

          {/* Category-specific form */}
          {category === 'strength' ? (
            <StrengthForm sets={sets} onSetsChange={setSets}
              strengthGroups={strengthGroups} exerciseType={exerciseType}
              onExerciseTypeChange={setExerciseType} errorField={errorField}
              lastStrength={lastStrength} canCopyLast={isSetsEmpty} onCopyLast={copyLastStrength} />
          ) : (
            <CardioForm exerciseType={exerciseType} commonCardio={commonCardio}
              onExerciseTypeChange={setExerciseType}
              durationMin={durationMin} onDurationChange={setDurationMin}
              cardioParams={cardioParams} onCardioParamChange={(k, v) => setCardioParams({ ...cardioParams, [k]: v })}
              showTimer={showTimer} onToggleTimer={() => setShowTimer(!showTimer)}
              onTimerSave={handleTimerSave} errorField={errorField} />
          )}
        </div>

        {/* Strength duration (optional) */}
        {category === 'strength' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-light text-theme-secondary">运动时长</label>
              <button onClick={() => setShowTimer(!showTimer)}
                className="text-xs px-3 py-1 rounded-full transition-all duration-200"
                style={showTimer
                  ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
                  : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
                }>
                {showTimer ? '关闭计时器' : '⏱ 计时器'}
              </button>
            </div>
            {showTimer ? (
              <Timer onSave={handleTimerSave} />
            ) : (
              <div className="relative">
                <input type="number" inputMode="numeric" value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="0" className="input-field pr-14" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-theme-tertiary">分钟</span>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div>
          <label className="text-sm font-light mb-2 block text-theme-secondary">备注</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="感受、调整..." className="input-field" />
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          {editExercise ? '更新记录' : '保存记录'}
        </button>
      </div>
    </div>
  )
}
