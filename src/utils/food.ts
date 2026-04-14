import type { AppRecord, FoodItem, FoodRecord } from '../types'

function normalizeFoodName(name: unknown): string {
  return typeof name === 'string' ? name.trim() : ''
}

function normalizeFoodNote(note: unknown): string | null {
  return typeof note === 'string' && note.trim() ? note.trim() : null
}

function normalizeCalories(calories: unknown): number | null {
  if (typeof calories !== 'number' || Number.isNaN(calories) || calories < 0) return null
  return calories
}

export function getFoodItems(record: FoodRecord): FoodItem[] {
  if (Array.isArray(record.items) && record.items.length > 0) {
    return record.items
      .map((item) => ({
        name: normalizeFoodName(item?.name),
        note: normalizeFoodNote(item?.note),
        calories: normalizeCalories(item?.calories),
      }))
      .filter((item) => item.name)
  }

  const legacyName = normalizeFoodName(record.name)
  if (!legacyName) return []

  return [{ name: legacyName, note: normalizeFoodNote(record.note), calories: null }]
}

export function getFoodDisplayName(record: FoodRecord): string {
  const items = getFoodItems(record)
  if (items.length === 0) return '未命名餐食'
  return items.map((item) => item.name).join('、')
}

export function getFoodItemCount(record: FoodRecord): number {
  return getFoodItems(record).length
}

export function getFoodTotalCalories(record: FoodRecord): number {
  return getFoodItems(record).reduce((sum, item) => sum + (item.calories ?? 0), 0)
}

export interface LastMealSnapshot {
  items: FoodItem[]
  date: string
}

export function getLastMealItems(
  records: AppRecord[],
  category: FoodRecord['category'],
  excludeId?: string | null,
): LastMealSnapshot | null {
  const sorted = records
    .filter((r): r is FoodRecord => r.type === 'food' && r.category === category && r.id !== excludeId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.createdAt < b.createdAt ? 1 : -1
    })

  for (const record of sorted) {
    const items = getFoodItems(record)
    if (items.length > 0) return { items, date: record.date }
  }
  return null
}

interface FoodFrequencyStat {
  count: number
  lastUsed: string
}

export function getFrequentFoodNames(records: AppRecord[], limit = 15): string[] {
  const stats = new Map<string, FoodFrequencyStat>()

  for (const record of records) {
    if (record.type !== 'food') continue
    for (const item of getFoodItems(record)) {
      const key = item.name
      const existing = stats.get(key)
      if (existing) {
        existing.count += 1
        if (record.createdAt > existing.lastUsed) existing.lastUsed = record.createdAt
      } else {
        stats.set(key, { count: 1, lastUsed: record.createdAt })
      }
    }
  }

  return Array.from(stats.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count
      return b[1].lastUsed < a[1].lastUsed ? 1 : -1
    })
    .slice(0, limit)
    .map(([name]) => name)
}

export function mergeSmartFoodSuggestions(
  frequent: string[],
  fallback: string[],
  limit = 18,
): string[] {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const name of [...frequent, ...fallback]) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    merged.push(name)
    if (merged.length >= limit) break
  }
  return merged
}
