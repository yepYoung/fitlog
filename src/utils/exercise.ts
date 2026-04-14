import type { AppRecord, ExerciseRecord, StrengthSet } from '../types'

export interface LastStrengthSnapshot {
  sets: StrengthSet[]
  date: string
  durationMin: number | null
}

export function getLastStrengthRecord(
  records: AppRecord[],
  exerciseType: string,
  excludeId?: string | null,
): LastStrengthSnapshot | null {
  const target = exerciseType.trim()
  if (!target) return null

  const sorted = records
    .filter(
      (r): r is ExerciseRecord =>
        r.type === 'exercise' &&
        r.exerciseCategory === 'strength' &&
        r.exerciseType === target &&
        r.id !== excludeId,
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.createdAt < b.createdAt ? 1 : -1
    })

  for (const record of sorted) {
    if (Array.isArray(record.sets) && record.sets.length > 0) {
      return {
        sets: record.sets,
        date: record.date,
        durationMin: record.durationMin ?? null,
      }
    }
  }
  return null
}

export function formatStrengthSets(sets: StrengthSet[]): string {
  return sets.map((s) => `${s.weight}kg×${s.reps}`).join(' / ')
}

export function getMaxStrengthWeight(sets: StrengthSet[]): number {
  return sets.reduce((max, s) => (s.weight > max ? s.weight : max), 0)
}
