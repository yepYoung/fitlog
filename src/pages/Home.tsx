import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { getToday, getGreeting, getMealLabel } from '../utils/constants'
import SwipeToDelete from '../components/SwipeToDelete'
import usePhotoURL from '../hooks/usePhotoURL'
import type { AppRecord, ExerciseRecord, FoodRecord, WeightRecord } from '../types'

function SummaryCard() {
  const records = useStore((s) => s.records)
  const settings = useStore((s) => s.settings)
  const today = getToday()

  const { mealCount, exerciseMin } = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === today)
    const meals = todayRecords.filter((r) => r.type === 'food').length
    const exMin = todayRecords
      .filter((r): r is ExerciseRecord => r.type === 'exercise')
      .reduce((sum, r) => sum + (r.durationMin || 0), 0)
    return { mealCount: meals, exerciseMin: exMin }
  }, [records, today])

  const { dailyExerciseGoal } = settings
  const exPct = dailyExerciseGoal > 0 ? Math.min((exerciseMin / dailyExerciseGoal) * 100, 100) : 0

  return (
    <div className="glass p-5 animate-slide-up">
      <div className="flex gap-4">
        {/* Meals */}
        <div className="flex-1">
          <span className="text-xs block mb-1 text-theme-tertiary">今日饮食</span>
          <span className="text-3xl font-bold">{mealCount}</span>
          <span className="text-sm ml-1 text-theme-tertiary">餐</span>
        </div>
        {/* Divider */}
        <div style={{ width: 1, background: 'var(--glass-divider)' }} />
        {/* Exercise */}
        <div className="flex-1">
          <span className="text-xs block mb-1 text-theme-tertiary">今日运动</span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold">{exerciseMin}</span>
            <span className="text-sm text-theme-tertiary">/ {dailyExerciseGoal} 分钟</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-bar">
            <div className="h-full rounded-full transition-all duration-700 ease-out progress-glow"
              style={{ width: `${exPct}%`, background: 'linear-gradient(90deg, #34D399, #60A5FA)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatExerciseDetail(record: ExerciseRecord) {
  if (record.exerciseCategory === 'strength' && record.sets) {
    const parts = [`${record.sets.length} 组 · ${record.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`]
    if (record.durationMin) parts.push(`${record.durationMin}分钟`)
    return parts.join(' · ')
  }
  if (record.durationMin) {
    const params = record.cardioParams || {}
    const parts = [record.durationMin + '分钟']
    if (params.incline) parts.push(`坡度${params.incline}%`)
    if (params.speed) parts.push(`${params.speed}km/h`)
    if (params.resistance) parts.push(`阻力${params.resistance}`)
    if (params.distance) parts.push(`${params.distance}${params.distance > 100 ? 'm' : 'km'}`)
    return parts.join(' · ')
  }
  return ''
}

function WeightCard() {
  const records = useStore((s) => s.records)
  const addRecord = useStore((s) => s.addRecord)
  const showToast = useStore((s) => s.showToast)
  const today = getToday()
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)

  const { todayWeight, yesterdayWeight } = useMemo(() => {
    const weightRecords = records.filter((r): r is WeightRecord => r.type === 'weight')
    const todayR = weightRecords.filter((r) => r.date === today).sort((a, b) => b.time.localeCompare(a.time))
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    const yR = weightRecords.filter((r) => r.date === yStr).sort((a, b) => a.time.localeCompare(b.time))
    return { todayWeight: todayR[0]?.weight ?? null, yesterdayWeight: yR[0]?.weight ?? null }
  }, [records, today])

  const diff = todayWeight != null && yesterdayWeight != null ? todayWeight - yesterdayWeight : null

  function handleSave() {
    const val = parseFloat(input)
    if (!val || val <= 0) { showToast('请输入有效体重'); return }
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    addRecord({ type: 'weight', date: today, time: timeStr, weight: val, note: null } as Omit<WeightRecord, 'id' | 'createdAt'>)
    showToast('体重已记录')
    setInput('')
    setEditing(false)
  }

  return (
    <div className="glass p-4 mt-4 animate-slide-up" style={{ animationDelay: '0.03s' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-theme-tertiary">今日体重</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--chip-bg)', color: 'var(--text-accent)', border: '1px solid var(--chip-border)' }}>
            {todayWeight != null ? '更新' : '+ 记录'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <input type="number" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={todayWeight?.toString() ?? '0.0'} className="input-field pr-10 text-center" autoFocus />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-tertiary">kg</span>
          </div>
          <button onClick={handleSave} className="btn-primary shrink-0 px-4 py-2">保存</button>
          <button onClick={() => { setEditing(false); setInput('') }} className="p-2 shrink-0 text-theme-tertiary">&times;</button>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 mt-1">
          {todayWeight != null ? (
            <>
              <span className="text-3xl font-bold">{todayWeight}</span>
              <span className="text-sm text-theme-tertiary">kg</span>
              {diff != null && (
                <span className="text-sm font-medium ml-1" style={{ color: diff > 0 ? 'var(--text-red, #f87171)' : diff < 0 ? 'var(--text-green)' : 'var(--text-tertiary)' }}>
                  {diff > 0 ? `↑${diff.toFixed(1)}` : diff < 0 ? `↓${Math.abs(diff).toFixed(1)}` : '→ 持平'}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-theme-tertiary">点击右上角记录今日体重</span>
          )}
        </div>
      )}
    </div>
  )
}

function RecordItem({ record, onEdit, onDelete }: { record: AppRecord; onEdit: () => void; onDelete?: () => void }) {
  const isFood = record.type === 'food'
  const foodRec = isFood ? (record as FoodRecord) : null
  const exRec = record.type === 'exercise' ? (record as ExerciseRecord) : null
  const photoURL = usePhotoURL(foodRec ? (foodRec.photoId ?? foodRec.photo) : null)
  const content = (
    <button onClick={onEdit} className="w-full text-left p-4 flex items-center gap-3 bg-item">
      {isFood && photoURL
        ? <img src={photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
        : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: isFood ? 'var(--food-icon-bg)' : 'var(--exercise-icon-bg)' }}>
            {isFood ? '🍽️' : exRec?.exerciseCategory === 'strength' ? '🏋️' : '🏃'}
          </div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{foodRec ? foodRec.name : exRec?.exerciseType}</span>
          {foodRec && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--text-secondary)', background: 'var(--chip-bg)' }}>
              {getMealLabel(foodRec.category)}
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5 truncate text-theme-tertiary">
          {isFood ? (
            <>{record.time}{record.note && ` · ${record.note}`}</>
          ) : exRec ? (
            formatExerciseDetail(exRec)
          ) : null}
        </div>
      </div>
    </button>
  )
  if (onDelete) return <SwipeToDelete onDelete={onDelete}>{content}</SwipeToDelete>
  return content
}

export default function Home() {
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const deleteRecord = useStore((s) => s.deleteRecord)
  const today = getToday()

  const { foodRecords, exerciseRecords } = useMemo(() => {
    const todays = records.filter((r) => r.date === today)
      .sort((a, b) => (a.time && b.time) ? a.time.localeCompare(b.time) : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return {
      foodRecords: todays.filter((r): r is FoodRecord => r.type === 'food'),
      exerciseRecords: todays.filter((r): r is ExerciseRecord => r.type === 'exercise'),
    }
  }, [records, today])

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  function editUrl(r: AppRecord) {
    return r.type === 'food' ? `/record/food?edit=${r.id}` : `/record/exercise?edit=${r.id}`
  }

  return (
    <div className="px-4 pt-12 safe-top">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-sm mt-1 text-theme-tertiary">{dateStr} {weekdays[now.getDay()]}</p>
      </div>

      <SummaryCard />
      <WeightCard />

      <div className="flex gap-3 mt-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <button onClick={() => navigate('/record/food')} className="flex-1 btn-primary flex items-center justify-center gap-2 text-base">
          <span className="text-lg">+</span> 饮食
        </button>
        <button onClick={() => navigate('/record/exercise')} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-base">
          <span className="text-lg">+</span> 运动
        </button>
      </div>

      {/* Food Records */}
      <div className="mt-6">
        <h2 className="text-base font-semibold mb-3 text-theme-secondary">🍽️ 今日饮食</h2>
        {foodRecords.length === 0 ? (
          <div className="glass text-center py-8 text-theme-tertiary">
            <p className="text-sm">还没有饮食记录</p>
          </div>
        ) : (
          <div className="glass overflow-hidden divide-y border-glass-divider">
            {foodRecords.map((r) => (
              <RecordItem key={r.id} record={r} onEdit={() => navigate(editUrl(r))} />
            ))}
          </div>
        )}
      </div>

      {/* Exercise Records */}
      <div className="mt-5 mb-4">
        <h2 className="text-base font-semibold mb-3 text-theme-secondary">💪 今日运动</h2>
        {exerciseRecords.length === 0 ? (
          <div className="glass text-center py-8 text-theme-tertiary">
            <p className="text-sm">还没有运动记录</p>
          </div>
        ) : (
          <div className="glass overflow-hidden divide-y border-glass-divider">
            {exerciseRecords.map((r) => (
              <RecordItem key={r.id} record={r} onEdit={() => navigate(editUrl(r))} onDelete={() => deleteRecord(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
