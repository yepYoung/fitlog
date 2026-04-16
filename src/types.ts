export interface FoodItem {
  name: string
  note: string | null
  calories: number | null
}

export interface FoodRecord {
  id: string
  type: 'food'
  date: string
  time: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: FoodItem[]
  photoId: string | null
  /** @deprecated Use items instead */
  name?: string
  /** @deprecated Use items instead */
  note?: string | null
  /** @deprecated Use photoId instead */
  photo?: string | null
  createdAt: string
}

export interface StrengthSet {
  weight: number
  reps: number
}

export interface ExerciseRecord {
  id: string
  type: 'exercise'
  exerciseCategory: 'strength' | 'cardio'
  exerciseType: string
  date: string
  time: string
  sets?: StrengthSet[]
  durationMin?: number
  cardioParams?: Record<string, number>
  note: string | null
  createdAt: string
}

export interface ExerciseDraft {
  exerciseCategory: 'strength' | 'cardio'
  exerciseType: string
  sets: Array<{ weight: string; reps: string }>
  durationMin: string
  cardioParams: Record<string, string>
  note: string
  showTimer: boolean
}

export interface WeightRecord {
  id: string
  type: 'weight'
  date: string
  time: string
  weight: number
  note: string | null
  createdAt: string
}

export interface ReflectionRecord {
  id: string
  type: 'reflection'
  date: string
  time: string
  content: string
  createdAt: string
}

export type AppRecord = FoodRecord | ExerciseRecord | WeightRecord | ReflectionRecord

/** Distributive Omit that preserves union members */
export type NewRecord = {
  [K in AppRecord['type']]: Omit<Extract<AppRecord, { type: K }>, 'id' | 'createdAt'>
}[AppRecord['type']]

export interface StrengthGroup {
  group: string
  items: string[]
}

export interface Settings {
  dailyExerciseGoal: number
  commonFoods: string[]
  commonStrength: StrengthGroup[]
  commonCardio: string[]
}

export interface CardioParamDef {
  key: string
  label: string
  unit: string
}

export interface MealType {
  key: string
  label: string
  icon: string
}
