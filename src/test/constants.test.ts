import { describe, it, expect } from 'vitest'
import { formatDate, formatTimer, getAutoMealType, getMealLabel, getToday } from '../utils/constants'

describe('formatDate', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 3, 12))).toBe('2026-04-12')
  })

  it('pads single-digit month and day', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('getToday', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatTimer', () => {
  it('formats 0 seconds', () => {
    expect(formatTimer(0)).toBe('00:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTimer(45)).toBe('00:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatTimer(125)).toBe('02:05')
  })

  it('formats large values', () => {
    expect(formatTimer(3661)).toBe('61:01')
  })
})

describe('getMealLabel', () => {
  it('returns correct label for known keys', () => {
    expect(getMealLabel('breakfast')).toBe('早餐')
    expect(getMealLabel('lunch')).toBe('午餐')
    expect(getMealLabel('dinner')).toBe('晚餐')
    expect(getMealLabel('snack')).toBe('加餐')
  })

  it('returns the key itself for unknown keys', () => {
    expect(getMealLabel('unknown')).toBe('unknown')
  })
})

describe('getAutoMealType', () => {
  it('returns a valid meal type string', () => {
    const result = getAutoMealType()
    expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(result)
  })
})
