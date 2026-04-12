import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { getToday, getGreeting, getMealLabel } from '../utils/constants'
import SwipeToDelete from '../components/SwipeToDelete'

function SummaryCard() {
  const records = useStore((s) => s.records)
  const settings = useStore((s) => s.settings)
  const today = getToday()

  const { mealCount, exerciseMin } = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === today)
    const meals = todayRecords.filter((r) => r.type === 'food').length
    const exMin = todayRecords
      .filter((r) => r.type === 'exercise')
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
          <span className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>今日饮食</span>
          <span className="text-3xl font-bold">{mealCount}</span>
          <span className="text-sm ml-1" style={{ color: 'var(--text-tertiary)' }}>餐</span>
        </div>
        {/* Divider */}
        <div style={{ width: 1, background: 'var(--glass-divider)' }} />
        {/* Exercise */}
        <div className="flex-1">
          <span className="text-xs block mb-1" style={{ color: 'var(--text-tertiary)' }}>今日运动</span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold">{exerciseMin}</span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/ {dailyExerciseGoal} 分钟</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bar-bg)' }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${exPct}%`, background: 'linear-gradient(90deg, #34D399, #60A5FA)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatExerciseDetail(record) {
  if (record.exerciseCategory === 'strength' && record.sets) {
    return `${record.sets.length} 组 · ${record.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`
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

function RecordItem({ record, onEdit, onDelete }) {
  const isFood = record.type === 'food'
  return (
    <SwipeToDelete onDelete={onDelete}>
      <button onClick={onEdit} className="w-full text-left p-4 flex items-center gap-3" style={{ background: 'var(--item-bg)' }}>
        {isFood && record.photo
          ? <img src={record.photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
          : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: isFood ? 'var(--food-icon-bg)' : 'var(--exercise-icon-bg)' }}>
              {isFood ? '🍽️' : record.exerciseCategory === 'strength' ? '🏋️' : '🏃'}
            </div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{isFood ? record.name : record.exerciseType}</span>
            {isFood && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--text-secondary)', background: 'var(--chip-bg)' }}>
                {getMealLabel(record.category)}
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
            {isFood ? (
              <>{record.time}{record.note && ` · ${record.note}`}</>
            ) : (
              formatExerciseDetail(record)
            )}
          </div>
        </div>
      </button>
    </SwipeToDelete>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const deleteRecord = useStore((s) => s.deleteRecord)
  const today = getToday()

  const { foodRecords, exerciseRecords } = useMemo(() => {
    const todays = records.filter((r) => r.date === today)
      .sort((a, b) => (a.time && b.time) ? a.time.localeCompare(b.time) : new Date(a.createdAt) - new Date(b.createdAt))
    return {
      foodRecords: todays.filter((r) => r.type === 'food'),
      exerciseRecords: todays.filter((r) => r.type === 'exercise'),
    }
  }, [records, today])

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  function editUrl(r) {
    return r.type === 'food' ? `/record/food?edit=${r.id}` : `/record/exercise?edit=${r.id}`
  }

  return (
    <div className="px-4 pt-12 safe-top">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{dateStr} {weekdays[now.getDay()]}</p>
      </div>

      <SummaryCard />

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
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>🍽️ 今日饮食</h2>
        {foodRecords.length === 0 ? (
          <div className="glass text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-sm">还没有饮食记录</p>
          </div>
        ) : (
          <div className="glass overflow-hidden divide-y" style={{ borderColor: 'var(--glass-divider)' }}>
            {foodRecords.map((r) => (
              <RecordItem key={r.id} record={r} onEdit={() => navigate(editUrl(r))} onDelete={() => deleteRecord(r.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Exercise Records */}
      <div className="mt-5 mb-4">
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>💪 今日运动</h2>
        {exerciseRecords.length === 0 ? (
          <div className="glass text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-sm">还没有运动记录</p>
          </div>
        ) : (
          <div className="glass overflow-hidden divide-y" style={{ borderColor: 'var(--glass-divider)' }}>
            {exerciseRecords.map((r) => (
              <RecordItem key={r.id} record={r} onEdit={() => navigate(editUrl(r))} onDelete={() => deleteRecord(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
