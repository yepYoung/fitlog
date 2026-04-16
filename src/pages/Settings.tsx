import { useState } from 'react'
import useStore from '../store/useStore'
import { clearAllData, exportData } from '../utils/storage'
import PageBackground from '../components/PageBackground'
import type { StrengthGroup } from '../types'
import type { ThemeMode } from '../utils/theme'

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'auto', label: '跟随系统' },
  { key: 'dark', label: '深色' },
  { key: 'light', label: '浅色' },
]

interface EditableChipListProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  activeColor?: string
}

function EditableChipList({ items, onChange, placeholder, activeColor = 'var(--text-accent)' }: EditableChipListProps) {
  const [input, setInput] = useState('')
  function handleAdd() {
    const val = input.trim()
    if (val && !items.includes(val)) { onChange([...items, val]); setInput('') }
  }
  function handleRemove(item: string) { onChange(items.filter((i: string) => i !== item)) }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
            style={{ background: 'var(--chip-bg)', color: activeColor, border: '1px solid var(--chip-border)' }}>
            {item}
            <button onClick={() => handleRemove(item)} className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder={placeholder} className="input-field flex-1" />
        <button onClick={handleAdd} className="btn-primary shrink-0 px-4">添加</button>
      </div>
    </div>
  )
}

interface EditableGroupedChipListProps {
  groups: StrengthGroup[]
  onChange: (groups: StrengthGroup[]) => void
  activeColor?: string
}

function EditableGroupedChipList({ groups, onChange, activeColor = 'var(--text-accent)' }: EditableGroupedChipListProps) {
  const [input, setInput] = useState('')
  const [activeGroup, setActiveGroup] = useState(groups[0]?.group ?? '')

  function handleAdd() {
    const val = input.trim()
    if (!val || !activeGroup) return
    const updated = groups.map((g: StrengthGroup) =>
      g.group === activeGroup && !g.items.includes(val) ? { ...g, group: g.group, items: [...g.items, val] } : g
    )
    onChange(updated)
    setInput('')
  }

  function handleRemove(groupName: string, item: string) {
    onChange(groups.map((g: StrengthGroup) =>
      g.group === groupName ? { ...g, items: g.items.filter((i: string) => i !== item) } : g
    ))
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.group}>
          <span className="text-xs font-medium mb-1.5 block text-theme-tertiary">{g.group}</span>
          <div className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                style={{ background: 'var(--chip-bg)', color: activeColor, border: '1px solid var(--chip-border)' }}>
                {item}
                <button onClick={() => handleRemove(g.group, item)} className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <select value={activeGroup} onChange={(e) => setActiveGroup(e.target.value)} className="input-field w-20 shrink-0 text-sm">
          {groups.map((g) => <option key={g.group} value={g.group}>{g.group}</option>)}
        </select>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="添加新的力量动作" className="input-field flex-1" />
        <button onClick={handleAdd} className="btn-primary shrink-0 px-4">添加</button>
      </div>
    </div>
  )
}

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const showToast = useStore((s) => s.showToast)
  const themeMode = useStore((s) => s.themeMode)
  const setThemeMode = useStore((s) => s.setThemeMode)

  function handleExport() {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `fitlog-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('数据已导出')
  }

  function handleClearAll() {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。'))
      if (window.confirm('再次确认：真的要清除所有数据吗？'))
        { clearAllData(); window.location.reload() }
  }

  return (
    <>
      <PageBackground src="/bg-settings.png" />
      <div className="px-4 pt-12 safe-top pb-8">
      <h1 className="text-2xl font-bold mb-6">设置</h1>

      {/* Theme */}
      <div className="glass p-5 mb-4 animate-slide-up">
        <h2 className="text-base font-semibold mb-4 text-theme-secondary">外观模式</h2>
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--glass-input)', border: '1px solid var(--glass-border-light)' }}>
          {THEME_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setThemeMode(opt.key)}
              className="flex-1 py-2.5 text-sm font-medium transition-all duration-200"
              style={themeMode === opt.key
                ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Common Strength */}
      <div className="glass p-5 mb-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <h2 className="text-base font-semibold mb-4 text-theme-secondary">常用力量动作</h2>
        <EditableGroupedChipList groups={settings.commonStrength ?? []}
          onChange={(v) => updateSettings({ commonStrength: v })}
          activeColor="var(--text-accent)" />
      </div>

      {/* Common Cardio */}
      <div className="glass p-5 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-base font-semibold mb-4 text-theme-secondary">常用有氧运动</h2>
        <EditableChipList items={settings.commonCardio ?? []}
          onChange={(v) => updateSettings({ commonCardio: v })} placeholder="添加新的有氧运动"
          activeColor="var(--text-green)" />
      </div>

      {/* Data */}
      <div className="glass p-5 mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="text-base font-semibold mb-4 text-theme-secondary">数据管理</h2>
        <div className="space-y-2">
          <button onClick={handleExport} className="btn-secondary w-full">导出数据 (JSON)</button>
          <button onClick={handleClearAll} className="btn-danger w-full">清除所有数据</button>
        </div>
      </div>
      </div>
    </>
  )
}
