import { describe, it, expect, beforeEach } from 'vitest'
import { loadRecords, saveRecords, loadSettings, saveSettings, clearAllData, exportData } from '../utils/storage'
import type { AppRecord, Settings } from '../types'

beforeEach(() => {
  localStorage.clear()
})

describe('records CRUD', () => {
  it('returns empty array when no data', () => {
    expect(loadRecords()).toEqual([])
  })

  it('saves and loads records', () => {
    const records: AppRecord[] = [
      {
        id: '1', type: 'food', date: '2026-04-12', time: '12:00',
        category: 'lunch', items: [{ name: '米饭', note: null, calories: null }], photoId: null, createdAt: '2026-04-12T12:00:00Z',
      },
      {
        id: '2', type: 'reflection', date: '2026-04-12', time: '22:00',
        content: '今天训练状态不错。', createdAt: '2026-04-12T22:00:00Z',
      },
    ]
    saveRecords(records)
    expect(loadRecords()).toEqual(records)
  })

  it('overwrites previous records', () => {
    saveRecords([
      { id: '1', type: 'food', date: '2026-04-12', time: '12:00', category: 'lunch', items: [{ name: 'A', note: null, calories: null }], photoId: null, createdAt: '' },
    ])
    saveRecords([
      { id: '2', type: 'food', date: '2026-04-12', time: '13:00', category: 'dinner', items: [{ name: 'B', note: null, calories: null }], photoId: null, createdAt: '' },
    ])
    const loaded = loadRecords()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('2')
  })

  it('migrates legacy food records to items', () => {
    localStorage.setItem('fitlog_data', JSON.stringify({
      records: [
        {
          id: '1',
          type: 'food',
          date: '2026-04-12',
          time: '12:00',
          category: 'lunch',
          name: '鸡胸肉',
          note: '200g',
          photo: 'data:image/png;base64,abc',
          createdAt: '2026-04-12T12:00:00Z',
        },
      ],
    }))

    expect(loadRecords()).toEqual([
      {
        id: '1',
        type: 'food',
        date: '2026-04-12',
        time: '12:00',
        category: 'lunch',
        items: [{ name: '鸡胸肉', note: '200g', calories: null }],
        photoId: 'data:image/png;base64,abc',
        createdAt: '2026-04-12T12:00:00Z',
      },
    ])
  })
})

describe('settings CRUD', () => {
  it('returns null when no settings', () => {
    expect(loadSettings()).toBeNull()
  })

  it('saves and loads settings', () => {
    const settings: Settings = {
      dailyExerciseGoal: 45,
      commonFoods: ['鸡蛋'],
      commonStrength: [{ group: '胸部', items: ['卧推'] }],
      commonCardio: ['跑步'],
    }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })
})

describe('clearAllData', () => {
  it('removes all data', () => {
    saveRecords([{ id: '1', type: 'food', date: '', time: '', category: 'lunch', items: [{ name: 'X', note: null, calories: null }], photoId: null, createdAt: '' }])
    clearAllData()
    expect(loadRecords()).toEqual([])
    expect(loadSettings()).toBeNull()
  })
})

describe('exportData', () => {
  it('exports saved data', () => {
    const records: AppRecord[] = [
      { id: '1', type: 'weight', date: '2026-04-12', time: '08:00', weight: 75, note: null, createdAt: '' },
    ]
    saveRecords(records)
    const data = exportData()
    expect(data.records).toEqual(records)
  })
})
