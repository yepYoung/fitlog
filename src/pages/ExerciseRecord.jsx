import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useStore from '../store/useStore'
import { CARDIO_PARAMS, getToday, STRENGTH_GROUPS } from '../utils/constants'
import Timer from '../components/Timer'

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

  const editRecord = editId ? records.find((r) => r.id === editId) : null

  const [category, setCategory] = useState(editRecord?.exerciseCategory ?? 'strength')
  const [exerciseType, setExerciseType] = useState(editRecord?.exerciseType ?? '')
  const [sets, setSets] = useState(editRecord?.sets ?? [{ weight: '', reps: '' }])
  const [durationMin, setDurationMin] = useState(editRecord?.durationMin?.toString() ?? '')
  const [cardioParams, setCardioParams] = useState(editRecord?.cardioParams ?? {})
  const [note, setNote] = useState(editRecord?.note ?? '')
  const [showTimer, setShowTimer] = useState(false)

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  function addSet() {
    setSets([...sets, { weight: '', reps: '' }])
  }
  function removeSet(i) {
    if (sets.length > 1) setSets(sets.filter((_, idx) => idx !== i))
  }
  function updateSet(i, field, val) {
    setSets(sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  function updateCardioParam(key, val) {
    setCardioParams({ ...cardioParams, [key]: val })
  }

  function handleTimerSave(minutes) {
    setDurationMin(String(minutes))
    setShowTimer(false)
    showToast(`已记录 ${minutes} 分钟`)
  }

  function handleSave() {
    if (!exerciseType.trim()) { showToast('请选择运动类型'); return }

    const base = {
      type: 'exercise',
      exerciseCategory: category,
      exerciseType: exerciseType.trim(),
      date: editRecord?.date ?? getToday(),
      time: editRecord?.time ?? timeStr,
      note: note.trim() || null,
    }

    if (category === 'strength') {
      const validSets = sets
        .filter((s) => s.weight || s.reps)
        .map((s) => ({
          weight: s.weight ? parseFloat(s.weight) : 0,
          reps: s.reps ? parseInt(s.reps, 10) : 0,
        }))
      if (validSets.length === 0) { showToast('请至少记录一组'); return }
      base.sets = validSets
    } else {
      if (!durationMin || parseInt(durationMin, 10) <= 0) { showToast('请输入运动时长'); return }
      base.durationMin = parseInt(durationMin, 10)
      const cleanParams = {}
      Object.entries(cardioParams).forEach(([k, v]) => {
        if (v) cleanParams[k] = parseFloat(v)
      })
      if (Object.keys(cleanParams).length > 0) base.cardioParams = cleanParams
    }

    if (editRecord) { updateRecord(editId, base); showToast('已更新') }
    else { addRecord(base); showToast('已记录') }
    navigate(-1)
  }

  const paramDefs = CARDIO_PARAMS[exerciseType] || []
  // For strength: use grouped structure; for cardio: flat list
  const strengthGroups = commonStrength?.length > 0 && typeof commonStrength[0] === 'object'
    ? commonStrength
    : STRENGTH_GROUPS

  return (
    <div className="min-h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 safe-top flex items-center justify-between"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{editRecord ? '编辑运动' : '记录运动'}</h1>
        <button onClick={handleSave} className="font-medium px-2 py-1" style={{ color: 'var(--text-accent)' }}>保存</button>
      </div>

      <div className="px-4 space-y-5 pb-10">
        {/* Category Toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--glass-input)', border: '1px solid var(--glass-border-light)' }}>
          {[{ key: 'strength', label: '💪 力量训练' }, { key: 'cardio', label: '🏃 有氧运动' }].map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setExerciseType('') }}
              className="flex-1 py-3 text-sm font-medium transition-all duration-200"
              style={category === c.key
                ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }>{c.label}</button>
          ))}
        </div>

        {/* Exercise Type */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            {category === 'strength' ? '动作名称' : '运动类型'}
          </label>
          <input type="text" value={exerciseType} onChange={(e) => setExerciseType(e.target.value)}
            placeholder={category === 'strength' ? '如：卧推、深蹲' : '如：跑步、椭圆机'}
            className="input-field" />
          {category === 'strength' ? (
            <div className="mt-3 space-y-3">
              {strengthGroups.map((g) => (
                <div key={g.group}>
                  <span className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>{g.group}</span>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((ex) => (
                      <button key={ex} onClick={() => setExerciseType(ex)}
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
          ) : (
            commonCardio.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {commonCardio.map((ex) => (
                  <button key={ex} onClick={() => setExerciseType(ex)}
                    className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                    style={exerciseType === ex
                      ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
                      : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
                    }>{ex}</button>
                ))}
              </div>
            )
          )}
        </div>

        {/* === Strength: Sets === */}
        {category === 'strength' && (
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>组数记录</label>
            <div className="space-y-2">
              {sets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-8 text-center shrink-0" style={{ color: 'var(--text-tertiary)' }}>#{i + 1}</span>
                  <div className="relative flex-1">
                    <input type="number" inputMode="decimal" value={s.weight}
                      onChange={(e) => updateSet(i, 'weight', e.target.value)}
                      placeholder="重量" className="input-field pr-10 text-center" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }}>kg</span>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)' }}>×</span>
                  <div className="relative flex-1">
                    <input type="number" inputMode="numeric" value={s.reps}
                      onChange={(e) => updateSet(i, 'reps', e.target.value)}
                      placeholder="次数" className="input-field text-center" />
                  </div>
                  {sets.length > 1 && (
                    <button onClick={() => removeSet(i)} className="p-2 shrink-0" style={{ color: 'var(--text-red)' }}>
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
        )}

        {/* === Cardio: Timer + Duration + Params === */}
        {category === 'cardio' && (
          <>
            {/* Timer toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>运动时长</label>
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
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}>分钟</span>
                </div>
              )}
            </div>

            {/* Cardio params */}
            {paramDefs.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>运动参数</label>
                <div className="grid grid-cols-2 gap-2">
                  {paramDefs.map((p) => (
                    <div key={p.key} className="relative">
                      <input type="number" inputMode="decimal"
                        value={cardioParams[p.key] ?? ''}
                        onChange={(e) => updateCardioParam(p.key, e.target.value)}
                        placeholder={p.label} className="input-field pr-12 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            备注 <span style={{ color: 'var(--text-tertiary)' }}>(选填)</span>
          </label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="感受、调整..." className="input-field" />
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          {editRecord ? '更新记录' : '保存记录'}
        </button>
      </div>
    </div>
  )
}
