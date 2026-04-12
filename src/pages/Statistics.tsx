import { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'
import useStore from '../store/useStore'
import { formatDate } from '../utils/constants'
import type { ExerciseRecord, WeightRecord } from '../types'

interface StatCardProps {
  label: string
  value: number
  unit: string
  color: string
}

function StatCard({ label, value, unit, color }: StatCardProps) {
  return (
    <div className="glass p-4 flex-1 min-w-0">
      <div className="text-xs mb-1 text-theme-tertiary">{label}</div>
      <div className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 text-theme-tertiary">{unit}</div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs" style={{ borderRadius: 12 }}>
      <div className="text-theme-secondary">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.value} 分钟
        </div>
      ))}
    </div>
  )
}

export default function Statistics() {
  const records = useStore((s) => s.records)
  const settings = useStore((s) => s.settings)
  const [range, setRange] = useState(7)

  const { exerciseData, exerciseDays, totalExerciseMin, mealCount, strengthRank, weightData } = useMemo(() => {
    const today = new Date()
    const exData = []
    const wData = []
    let totalExMin = 0
    let exDays = 0
    let meals = 0
    const strengthCount: Record<string, number> = {}

    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = formatDate(d)
      const dayRecords = records.filter((r) => r.date === dateStr)

      meals += dayRecords.filter((r) => r.type === 'food').length

      const dayEx = dayRecords.filter((r): r is ExerciseRecord => r.type === 'exercise')
      const dayExMin = dayEx.reduce((sum, r) => sum + (r.durationMin || 0), 0)
      totalExMin += dayExMin
      if (dayEx.length > 0) exDays++

      // Count strength exercises
      dayEx.filter((r) => r.exerciseCategory === 'strength').forEach((r) => {
        strengthCount[r.exerciseType] = (strengthCount[r.exerciseType] || 0) + 1
      })

      // Weight: take earliest record of the day
      const dayWeight = dayRecords
        .filter((r): r is WeightRecord => r.type === 'weight')
        .sort((a, b) => a.time.localeCompare(b.time))
      const label = range <= 7
        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
        : `${d.getMonth() + 1}/${d.getDate()}`
      exData.push({ name: label, minutes: dayExMin })
      if (dayWeight.length > 0) wData.push({ name: label, weight: dayWeight[0].weight })
    }

    const rank = Object.entries(strengthCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6) as [string, number][]

    return { exerciseData: exData, exerciseDays: exDays, totalExerciseMin: totalExMin, mealCount: meals, strengthRank: rank, weightData: wData }
  }, [records, range])

  const axisStyle = { fontSize: 11, fill: 'var(--text-tertiary)' }

  return (
    <div className="px-4 pt-12 safe-top pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">统计</h1>
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--glass-input)', border: '1px solid var(--glass-border-light)' }}>
          {[7, 30].map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className="px-4 py-1.5 text-sm font-medium transition-all duration-200"
              style={range === r
                ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }>{r === 7 ? '近7天' : '近30天'}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-3 mb-5 animate-slide-up">
        <StatCard label="运动天数" value={exerciseDays} unit="天" color="var(--text-green)" />
        <StatCard label="总运动" value={totalExerciseMin} unit="分钟" color="var(--text-accent)" />
        <StatCard label="饮食记录" value={mealCount} unit="餐" color="var(--text-yellow)" />
      </div>

      {/* Exercise Chart */}
      <div className="glass p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <h2 className="text-sm font-semibold mb-3 text-theme-secondary">运动时长趋势</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={exerciseData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-divider)" vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--glass-input)' }} />
            <ReferenceLine y={settings.dailyExerciseGoal} stroke="var(--text-tertiary)" strokeDasharray="4 4" />
            <defs>
              <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
            <Bar dataKey="minutes" fill="url(#exGrad)" radius={[4, 4, 0, 0]} maxBarSize={range <= 7 ? 32 : 14} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 border-t border-dashed" style={{ borderColor: 'var(--text-tertiary)' }} />
          <span className="text-xs text-theme-tertiary">目标 {settings.dailyExerciseGoal} 分钟/天</span>
        </div>
      </div>

      {/* Strength Ranking */}
      {/* Weight Trend */}
      {weightData.length > 1 && (
        <div className="glass p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-sm font-semibold mb-3 text-theme-secondary">体重趋势</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-divider)" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="glass px-3 py-2 text-xs" style={{ borderRadius: 12 }}>
                    <div className="text-theme-secondary">{label}</div>
                    <div className="font-semibold" style={{ color: '#f472b6' }}>{payload[0].value} kg</div>
                  </div>
                )
              }} />
              <Line type="monotone" dataKey="weight" stroke="#f472b6" strokeWidth={2} dot={{ fill: '#f472b6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strength Ranking */}
      {strengthRank.length > 0 && (
        <div className="glass p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-sm font-semibold mb-3 text-theme-secondary">力量训练频次</h2>
          <div className="space-y-2">
            {strengthRank.map(([name, count]) => {
              const maxCount = strengthRank[0][1]
              const pct = (count / maxCount) * 100
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs w-16 truncate text-theme-secondary">{name}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden bg-bar">
                    <div className="h-full rounded-md flex items-center pl-2 text-xs font-medium text-white transition-all duration-500"
                      style={{ width: `${Math.max(pct, 15)}%`, background: 'linear-gradient(90deg, #60A5FA, #818CF8)' }}>
                      {count}次
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
