import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../store/useStore'
import { clearAllData, loadRecords } from '../utils/storage'

beforeEach(() => {
  clearAllData()
  // Reset zustand store state directly
  useStore.setState({ records: [], settings: useStore.getState().settings })
})

describe('useStore', () => {
  it('adds a food record', () => {
    const record = useStore.getState().addRecord({
      type: 'food',
      date: '2026-04-12',
      time: '12:00',
      category: 'lunch',
      name: '鸡胸肉',
      note: null,
      photoId: null,
    })

    expect(record.id).toBeDefined()
    expect(record.createdAt).toBeDefined()
    expect(useStore.getState().records).toHaveLength(1)
    expect(useStore.getState().records[0].type).toBe('food')
    // Verify persisted to localStorage
    expect(loadRecords()).toHaveLength(1)
  })

  it('adds an exercise record', () => {
    useStore.getState().addRecord({
      type: 'exercise',
      exerciseCategory: 'strength',
      exerciseType: '卧推',
      date: '2026-04-12',
      time: '18:00',
      sets: [{ weight: 60, reps: 12 }],
      durationMin: 45,
      note: null,
    })

    const records = useStore.getState().records
    expect(records).toHaveLength(1)
    expect(records[0].type).toBe('exercise')
  })

  it('adds a weight record', () => {
    useStore.getState().addRecord({
      type: 'weight',
      date: '2026-04-12',
      time: '08:00',
      weight: 75.5,
      note: '晨起空腹',
    })

    const records = useStore.getState().records
    expect(records).toHaveLength(1)
    expect(records[0].type).toBe('weight')
  })

  it('updates a record', () => {
    const record = useStore.getState().addRecord({
      type: 'food',
      date: '2026-04-12',
      time: '12:00',
      category: 'lunch',
      name: '米饭',
      note: null,
      photoId: null,
    })

    useStore.getState().updateRecord(record.id, { name: '糙米饭' })
    const updated = useStore.getState().records[0]
    expect(updated.type === 'food' && updated.name).toBe('糙米饭')
  })

  it('deletes a record', () => {
    const record = useStore.getState().addRecord({
      type: 'food',
      date: '2026-04-12',
      time: '12:00',
      category: 'lunch',
      name: '米饭',
      note: null,
      photoId: null,
    })

    useStore.getState().deleteRecord(record.id)
    expect(useStore.getState().records).toHaveLength(0)
    expect(loadRecords()).toHaveLength(0)
  })

  it('updates settings', () => {
    useStore.getState().updateSettings({ dailyExerciseGoal: 90 })
    expect(useStore.getState().settings.dailyExerciseGoal).toBe(90)
  })
})
