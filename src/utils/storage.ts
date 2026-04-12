import type { AppRecord, Settings } from '../types'

interface StorageData {
  records?: AppRecord[]
  settings?: Settings
}

const STORAGE_KEY: string = 'fitlog_data'

function loadAll(): StorageData | null {
  try {
    const raw: string | null = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StorageData) : null
  } catch {
    return null
  }
}

function saveAll(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadRecords(): AppRecord[] {
  return loadAll()?.records ?? []
}

export function saveRecords(records: AppRecord[]): void {
  const data: StorageData = loadAll() ?? {}
  data.records = records
  saveAll(data)
}

export function loadSettings(): Settings | null {
  return loadAll()?.settings ?? null
}

export function saveSettings(settings: Settings): void {
  const data: StorageData = loadAll() ?? {}
  data.settings = settings
  saveAll(data)
}

export function exportData(): StorageData {
  return loadAll() ?? { records: [], settings: {} as Settings }
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY)
}
