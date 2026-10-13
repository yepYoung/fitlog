import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { loadRecords, saveRecords, loadSettings, saveSettings, loadExerciseDraft, saveExerciseDraft } from '../utils/storage'
import { deleteImage } from '../utils/imageDB'
import { DEFAULT_SETTINGS, STRENGTH_GROUPS } from '../utils/constants'
import { getStoredTheme, setStoredTheme, applyTheme } from '../utils/theme'
import type { ThemeMode } from '../utils/theme'
import type { AppRecord, ExerciseDraft, NewRecord, Settings } from '../types'
import { cloudRequest, loadCloudData, saveCloudRecord, saveCloudSettings, setCloudActive, type CloudData } from '../utils/cloud'

let changeVersion = 0
let refreshing: Promise<void> | null = null
const pendingCreates = new Map<string, AppRecord>()

export interface TimerState {
  running: boolean
  startedAt: number | null
  base: number
}

interface StoreState {
  records: AppRecord[]
  storageMode: 'local' | 'cloud'
  saving: boolean
  lastSynced: string | null
  activateCloud: (data: CloudData) => void
  refreshCloud: () => Promise<void>
  addRecord: (record: NewRecord) => Promise<AppRecord>
  updateRecord: (id: string, updates: Partial<AppRecord>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => Promise<void>
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toast: string | null
  showToast: (message: string, duration?: number) => void
  timer: TimerState
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  exerciseDraft: ExerciseDraft | null
  setExerciseDraft: (draft: ExerciseDraft) => void
  clearExerciseDraft: () => void
}

const useStore = create<StoreState>((set, get) => ({
  records: loadRecords(),
  storageMode: 'local',
  saving: false,
  lastSynced: null,
  activateCloud(data) {
    setCloudActive(true)
    changeVersion++
    set({ storageMode: 'cloud', records: data.records, settings: { ...DEFAULT_SETTINGS, ...data.settings, dailyExerciseGoal: DEFAULT_SETTINGS.dailyExerciseGoal }, lastSynced: new Date().toISOString() })
  },
  async refreshCloud() {
    if (get().storageMode !== 'cloud' || get().saving) return
    if (refreshing) return refreshing
    const version = changeVersion
    refreshing = (async () => {
      const data = await loadCloudData()
      // A slow refresh must not overwrite a save completed while it was in flight.
      if (version === changeVersion && !get().saving) get().activateCloud(data)
    })().finally(() => { refreshing = null })
    return refreshing
  },

  async addRecord(record: NewRecord) {
    if (get().saving) throw new Error('正在保存，请稍候')
    const fingerprint = JSON.stringify(record)
    const newRecord = pendingCreates.get(fingerprint) ?? { ...record, id: uuidv4(), createdAt: new Date().toISOString() } as AppRecord
    pendingCreates.set(fingerprint, newRecord)
    set({ saving: true }); changeVersion++
    try {
      if (get().storageMode === 'cloud') await saveCloudRecord(newRecord)
      const updated = [...get().records.filter((r) => r.id !== newRecord.id), newRecord]
      if (get().storageMode === 'local') saveRecords(updated)
      set({ records: updated, lastSynced: new Date().toISOString() })
      pendingCreates.delete(fingerprint)
      return newRecord
    } finally { changeVersion++; set({ saving: false }) }
  },

  async updateRecord(id: string, updates: Partial<AppRecord>) {
    if (get().saving) throw new Error('正在保存，请稍候')
    const original = get().records.find((r) => r.id === id)
    if (!original) throw new Error('记录不存在，请刷新后重试')
    const record = { ...original, ...updates, id: original.id, type: original.type, createdAt: original.createdAt } as AppRecord
    set({ saving: true }); changeVersion++
    try {
      if (get().storageMode === 'cloud') await saveCloudRecord(record)
      const updated = get().records.map((r) => r.id === id ? record : r)
      if (get().storageMode === 'local') saveRecords(updated)
      set({ records: updated, lastSynced: new Date().toISOString() })
    } finally { changeVersion++; set({ saving: false }) }
  },

  async deleteRecord(id: string) {
    if (get().saving) return
    const record = get().records.find((r) => r.id === id)
    set({ saving: true }); changeVersion++
    try {
      if (get().storageMode === 'cloud') await cloudRequest(`records/${id}`, { method: 'DELETE' })
      else if (record && 'photoId' in record && record.photoId && !record.photoId.startsWith('data:')) await deleteImage(record.photoId)
      const updated = get().records.filter((r) => r.id !== id)
      if (get().storageMode === 'local') saveRecords(updated)
      set({ records: updated, lastSynced: new Date().toISOString() })
    } catch (error) { get().showToast(error instanceof Error ? error.message : '删除失败，请重试') }
    finally { changeVersion++; set({ saving: false }) }
  },

  settings: (() => {
    const s: Settings = loadSettings() ?? { ...DEFAULT_SETTINGS }
    s.dailyExerciseGoal = DEFAULT_SETTINGS.dailyExerciseGoal
    // Migrate flat commonStrength array to grouped structure
    if (Array.isArray(s.commonStrength) && s.commonStrength.length > 0 && typeof s.commonStrength[0] === 'string') {
      s.commonStrength = STRENGTH_GROUPS.map((g) => ({ group: g.group, items: [...g.items] }))
    }
    return s
  })(),

  async updateSettings(partial: Partial<Settings>) {
    if (get().saving) { get().showToast('正在保存，请稍候'); return }
    set({ saving: true }); changeVersion++
    try {
      const patch = { ...partial, dailyExerciseGoal: DEFAULT_SETTINGS.dailyExerciseGoal }
      if (get().storageMode === 'cloud') await saveCloudSettings(patch)
      const updated = { ...get().settings, ...patch }
      if (get().storageMode === 'local') saveSettings(updated)
      set({ settings: updated, lastSynced: new Date().toISOString() })
    } catch (error) { get().showToast(error instanceof Error ? error.message : '设置未保存，请重试') }
    finally { changeVersion++; set({ saving: false }) }
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

  exerciseDraft: loadExerciseDraft(),
  setExerciseDraft(draft: ExerciseDraft) {
    saveExerciseDraft(draft)
    set({ exerciseDraft: draft })
  },
  clearExerciseDraft() {
    saveExerciseDraft(null)
    set({ exerciseDraft: null })
  },
}))

export default useStore
