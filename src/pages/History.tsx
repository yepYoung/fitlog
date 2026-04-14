import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { formatDate, getMealLabel } from '../utils/constants'
import { getFoodDisplayName, getFoodItemCount, getFoodTotalCalories } from '../utils/food'
import SwipeToDelete from '../components/SwipeToDelete'
import PageBackground from '../components/PageBackground'
import usePhotoURL from '../hooks/usePhotoURL'
import type { AppRecord, ExerciseRecord, ReflectionRecord } from '../types'

interface CalendarProps {
  year: number
  month: number
  datesWithRecords: Set<string>
  selectedDate: string
  onSelectDate: (date: string) => void
}

function Calendar({ year, month, datesWithRecords, selectedDate, onSelectDate }: CalendarProps) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = formatDate(new Date())
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <div key={w} className="text-center text-xs py-1 text-theme-tertiary">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasRecord = datesWithRecords.has(dateStr)
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <button key={dateStr} onClick={() => onSelectDate(dateStr)}
              className="relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-200"
              style={
                isSelected ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff', fontWeight: 600 }
                  : isToday ? { background: 'rgba(96,165,250,0.15)', color: 'var(--text-accent)', fontWeight: 600 }
                    : { color: 'var(--text-secondary)' }
              }>
              {day}
              {hasRecord && <div className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: isSelected ? '#fff' : 'var(--text-accent)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatExDetail(r: ExerciseRecord) {
  if (r.exerciseCategory === 'strength' && r.sets) {
    const parts = [`${r.sets.length}组 · ${r.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`]
    if (r.durationMin) parts.push(`${r.durationMin}分钟`)
    return parts.join(' · ')
  }
  if (r.durationMin) {
    const p = r.cardioParams || {}
    const parts = [r.durationMin + '分钟']
    if (p.incline) parts.push(`坡度${p.incline}%`)
    if (p.speed) parts.push(`${p.speed}km/h`)
    return parts.join(' · ')
  }
  return ''
}

interface HistoryItemProps {
  record: AppRecord
  onEdit: () => void
  onDelete: () => void
}

function HistoryItem({ record, onEdit, onDelete }: HistoryItemProps) {
  const isFood = record.type === 'food'
  const isExercise = record.type === 'exercise'
  const isReflection = record.type === 'reflection'
  const photoURL = usePhotoURL(isFood ? (record.photoId ?? record.photo) : null)
  const exRecord = isExercise ? record as ExerciseRecord : null
  const reflectionRecord = isReflection ? record as ReflectionRecord : null
  const reflectionPreview = reflectionRecord?.content.replace(/\s+/g, ' ').trim() ?? ''
  return (
    <SwipeToDelete onDelete={onDelete}>
      <button onClick={onEdit}
        className="w-full text-left p-3 flex items-center gap-3 bg-item">
        {isFood && photoURL
          ? <img src={photoURL} alt="" className="w-9 h-9 rounded-lg object-cover" />
          : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
              style={{ background: isFood ? 'var(--food-icon-bg)' : isReflection ? 'rgba(96, 165, 250, 0.1)' : 'var(--exercise-icon-bg)' }}>
              {isFood ? '🍽️' : isReflection ? 'F' : exRecord?.exerciseCategory === 'strength' ? '🏋️' : '🏃'}
            </div>}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">
            {isFood ? getFoodDisplayName(record) : isReflection ? '今日感想' : exRecord?.exerciseType}
          </span>
          <span className="text-xs truncate block text-theme-tertiary">
            {isFood
              ? `${record.time} · ${getMealLabel(record.category)} · ${getFoodItemCount(record)}项 · ${getFoodTotalCalories(record)}卡路里`
              : isReflection
                ? `${record.time} · ${reflectionPreview || '暂无内容'}`
                : exRecord ? formatExDetail(exRecord) : ''}
          </span>
        </div>
      </button>
    </SwipeToDelete>
  )
}

export default function History() {
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const deleteRecord = useStore((s) => s.deleteRecord)

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))

  const datesWithRecords = useMemo(() => {
    const dates = new Set<string>()
    records.forEach((r) => dates.add(r.date))
    return dates
  }, [records])

  const selectedRecords = useMemo(() => {
    return records.filter((r) => r.date === selectedDate)
      .sort((a, b) => (a.time && b.time) ? a.time.localeCompare(b.time) : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [records, selectedDate])

  function goMonth(delta: number) {
    let m = currentMonth + delta, y = currentYear
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setCurrentMonth(m); setCurrentYear(y)
  }

  const sd = new Date(selectedDate + 'T00:00:00')
  const selectedLabel = `${sd.getMonth() + 1}月${sd.getDate()}日`

  return (
    <>
      <PageBackground src="/bg-history.png" />
      <div className="px-4 pt-12 safe-top">
      <h1 className="text-2xl font-bold mb-4">历史记录</h1>

      <div className="glass p-4 mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goMonth(-1)} className="p-2 text-theme-tertiary">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-base font-semibold text-theme-secondary">{currentYear} 年 {currentMonth + 1} 月</span>
          <button onClick={() => goMonth(1)} className="p-2 text-theme-tertiary">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <Calendar year={currentYear} month={currentMonth} datesWithRecords={datesWithRecords}
          selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <div className="mb-4">
        <h2 className="text-base font-semibold mb-3 text-theme-secondary">{selectedLabel} 的记录</h2>
        {selectedRecords.length === 0
          ? <p className="text-center text-sm py-6 text-theme-tertiary">当天没有记录</p>
          : (
            <div className="glass overflow-hidden divide-y border-glass-divider">
              {selectedRecords.map((record) => (
                <HistoryItem key={record.id} record={record}
                  onEdit={() => navigate(
                    record.type === 'food'
                      ? `/record/food?edit=${record.id}`
                      : record.type === 'exercise'
                        ? `/record/exercise?edit=${record.id}`
                        : `/feeling?edit=${record.id}`
                  )}
                  onDelete={() => deleteRecord(record.id)} />
              ))}
            </div>
          )}
      </div>
      </div>
    </>
  )
}
