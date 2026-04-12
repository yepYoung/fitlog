const STORAGE_KEY = 'fitlog_data'

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadRecords() {
  return loadAll()?.records ?? []
}

export function saveRecords(records) {
  const data = loadAll() ?? {}
  data.records = records
  saveAll(data)
}

export function loadSettings() {
  return loadAll()?.settings ?? null
}

export function saveSettings(settings) {
  const data = loadAll() ?? {}
  data.settings = settings
  saveAll(data)
}

export function exportData() {
  return loadAll() ?? { records: [], settings: {} }
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY)
}
