import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { loadRecords, saveRecords, loadSettings, saveSettings } from '../utils/storage'
import { deleteImage } from '../utils/imageDB'
import { DEFAULT_SETTINGS, STRENGTH_GROUPS } from '../utils/constants'
import { getStoredTheme, setStoredTheme, applyTheme } from '../utils/theme'
import type { ThemeMode } from '../utils/theme'
import type { AppRecord, NewRecord, Settings } from '../types'

export interface TimerState {
  running: boolean
  startedAt: number | null
  base: number
}

interface StoreState {
  records: AppRecord[]
  addRecord: (record: NewRecord) => AppRecord
  updateRecord: (id: string, updates: Partial<AppRecord>) => void
  deleteRecord: (id: string) => void
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toast: string | null
  showToast: (message: string, duration?: number) => void
  timer: TimerState
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
}

const useStore = create<StoreState>((set, get) => ({
  records: loadRecords(),

  addRecord(record: NewRecord) {
    const newRecord = { ...record, id: uuidv4(), createdAt: new Date().toISOString() } as AppRecord
    const updated = [...get().records, newRecord]
    saveRecords(updated)
    set({ records: updated })
    return newRecord
  },

  updateRecord(id: string, updates: Partial<AppRecord>) {
    const updated = get().records.map((r) => (r.id === id ? { ...r, ...updates } : r)) as AppRecord[]
    saveRecords(updated)
    set({ records: updated })
  },

  deleteRecord(id: string) {
    const record = get().records.find((r) => r.id === id)
    if (record && 'photoId' in record && record.photoId && !record.photoId.startsWith('data:')) {
      deleteImage(record.photoId)
    }
    const updated = get().records.filter((r) => r.id !== id)
    saveRecords(updated)
    set({ records: updated })
  },

  settings: (() => {
    const s: Settings = loadSettings() ?? { ...DEFAULT_SETTINGS }
    // Migrate flat commonStrength array to grouped structure
    if (Array.isArray(s.commonStrength) && s.commonStrength.length > 0 && typeof s.commonStrength[0] === 'string') {
      s.commonStrength = STRENGTH_GROUPS.map((g) => ({ group: g.group, items: [...g.items] }))
      saveSettings(s)
    }
    return s
  })(),

  updateSettings(partial: Partial<Settings>) {
    const updated = { ...get().settings, ...partial }
    saveSettings(updated)
    set({ settings: updated })
  },

  themeMode: getStoredTheme(),
  setThemeMode(mode: ThemeMode) {
    setStoredTheme(mode)
    applyTheme(mode)
    set({ themeMode: mode })
  },

  toast: null,
  showToast(message: string, duration = 2000) {
    set({ toast: message })
    setTimeout(() => set({ toast: null }), duration)
  },

  timer: { running: false, startedAt: null, base: 0 },
  startTimer() {
    set({ timer: { running: true, startedAt: Date.now(), base: get().timer.base } })
  },
  pauseTimer() {
    const t = get().timer
    if (t.running && t.startedAt) {
      set({ timer: { running: false, startedAt: null, base: t.base + Math.floor((Date.now() - t.startedAt) / 1000) } })
    }
  },
  resetTimer() {
    set({ timer: { running: false, startedAt: null, base: 0 } })
  },
}))

export default useStore
