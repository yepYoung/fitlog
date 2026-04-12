import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { formatDate, getMealLabel } from '../utils/constants'
import SwipeToDelete from '../components/SwipeToDelete'

function Calendar({ year, month, datesWithRecords, selectedDate, onSelectDate }) {
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
          <div key={w} className="text-center text-xs py-1" style={{ color: 'var(--text-tertiary)' }}>{w}</div>
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

function formatExDetail(r) {
  if (r.exerciseCategory === 'strength' && r.sets) {
    return `${r.sets.length}组 · ${r.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}`
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

export default function History() {
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const deleteRecord = useStore((s) => s.deleteRecord)

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))

  const datesWithRecords = useMemo(() => {
    const dates = new Set()
    records.forEach((r) => dates.add(r.date))
    return dates
  }, [records])

  const selectedRecords = useMemo(() => {
    return records.filter((r) => r.date === selectedDate)
      .sort((a, b) => (a.time && b.time) ? a.time.localeCompare(b.time) : new Date(a.createdAt) - new Date(b.createdAt))
  }, [records, selectedDate])

  function goMonth(delta) {
    let m = currentMonth + delta, y = currentYear
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setCurrentMonth(m); setCurrentYear(y)
  }

  const sd = new Date(selectedDate + 'T00:00:00')
  const selectedLabel = `${sd.getMonth() + 1}月${sd.getDate()}日`

  return (
    <div className="px-4 pt-12 safe-top">
      <h1 className="text-2xl font-bold mb-4">历史记录</h1>

      <div className="glass p-4 mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goMonth(-1)} className="p-2" style={{ color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>{currentYear} 年 {currentMonth + 1} 月</span>
          <button onClick={() => goMonth(1)} className="p-2" style={{ color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <Calendar year={currentYear} month={currentMonth} datesWithRecords={datesWithRecords}
          selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <div className="mb-4">
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>{selectedLabel} 的记录</h2>
        {selectedRecords.length === 0
          ? <p className="text-center text-sm py-6" style={{ color: 'var(--text-tertiary)' }}>当天没有记录</p>
          : (
            <div className="glass overflow-hidden divide-y" style={{ borderColor: 'var(--glass-divider)' }}>
              {selectedRecords.map((record) => {
                const isFood = record.type === 'food'
                return (
                  <SwipeToDelete key={record.id} onDelete={() => deleteRecord(record.id)}>
                    <button onClick={() => navigate(isFood ? `/record/food?edit=${record.id}` : `/record/exercise?edit=${record.id}`)}
                      className="w-full text-left p-3 flex items-center gap-3" style={{ background: 'var(--item-bg)' }}>
                      {isFood && record.photo
                        ? <img src={record.photo} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                            style={{ background: isFood ? 'var(--food-icon-bg)' : 'var(--exercise-icon-bg)' }}>
                            {isFood ? '🍽️' : record.exerciseCategory === 'strength' ? '🏋️' : '🏃'}
                          </div>}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{isFood ? record.name : record.exerciseType}</span>
                        <span className="text-xs truncate block" style={{ color: 'var(--text-tertiary)' }}>
                          {isFood
                            ? `${record.time} · ${getMealLabel(record.category)}${record.note ? ` · ${record.note}` : ''}`
                            : formatExDetail(record)}
                        </span>
                      </div>
                    </button>
                  </SwipeToDelete>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
