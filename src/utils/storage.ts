import type { AppRecord, FoodItem, FoodRecord, Settings } from '../types'

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

function normalizeFoodItems(record: FoodRecord): FoodItem[] {
  if (Array.isArray(record.items) && record.items.length > 0) {
    return record.items
      .map((item) => ({
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        note: typeof item?.note === 'string' && item.note.trim() ? item.note.trim() : null,
        calories: typeof item?.calories === 'number' && !Number.isNaN(item.calories) && item.calories >= 0 ? item.calories : null,
      }))
      .filter((item) => item.name)
  }

  const legacyName = typeof record.name === 'string' ? record.name.trim() : ''
  if (!legacyName) return []

  return [{
    name: legacyName,
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
    calories: null,
  }]
}

export function loadRecords(): AppRecord[] {
  const data = loadAll()
  const records = data?.records ?? []
  let changed = false

  const normalized = records.map((record) => {
    if (record.type !== 'food') return record

    const items = normalizeFoodItems(record)
    const photoId = record.photoId ?? record.photo ?? null
    if (items !== record.items || photoId !== record.photoId || record.name !== undefined || record.note !== undefined || record.photo !== undefined) {
      changed = true
    }

    const normalizedRecord: FoodRecord = {
      id: record.id,
      type: 'food',
      date: record.date,
      time: record.time,
      category: record.category,
      items,
      photoId,
      createdAt: record.createdAt,
    }
    return normalizedRecord
  })

  if (changed && data) {
    data.records = normalized
    saveAll(data)
  }

  return normalized
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
