import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { loadRecords, saveRecords, loadSettings, saveSettings } from '../utils/storage'
import { DEFAULT_SETTINGS, STRENGTH_GROUPS } from '../utils/constants'
import { getStoredTheme, setStoredTheme, applyTheme } from '../utils/theme'

const useStore = create((set, get) => ({
  records: loadRecords(),

  addRecord(record) {
    const newRecord = { ...record, id: uuidv4(), createdAt: new Date().toISOString() }
    const updated = [...get().records, newRecord]
    saveRecords(updated)
    set({ records: updated })
    return newRecord
  },

  updateRecord(id, updates) {
    const updated = get().records.map((r) => (r.id === id ? { ...r, ...updates } : r))
    saveRecords(updated)
    set({ records: updated })
  },

  deleteRecord(id) {
    const updated = get().records.filter((r) => r.id !== id)
    saveRecords(updated)
    set({ records: updated })
  },

  settings: (() => {
    const s = loadSettings() ?? { ...DEFAULT_SETTINGS }
    // Migrate flat commonStrength array to grouped structure
    if (Array.isArray(s.commonStrength) && s.commonStrength.length > 0 && typeof s.commonStrength[0] === 'string') {
      s.commonStrength = STRENGTH_GROUPS.map((g) => ({ group: g.group, items: [...g.items] }))
      saveSettings(s)
    }
    return s
  })(),

  updateSettings(partial) {
    const updated = { ...get().settings, ...partial }
    saveSettings(updated)
    set({ settings: updated })
  },

  themeMode: getStoredTheme(),
  setThemeMode(mode) {
    setStoredTheme(mode)
    applyTheme(mode)
    set({ themeMode: mode })
  },

  toast: null,
  showToast(message, duration = 2000) {
    set({ toast: message })
    setTimeout(() => set({ toast: null }), duration)
  },
}))

export default useStore
