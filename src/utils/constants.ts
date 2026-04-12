import type { Settings, StrengthGroup, CardioParamDef, MealType } from '../types'

export const MEAL_TYPES: MealType[] = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' },
  { key: 'snack', label: '加餐', icon: '🍪' },
]

export const DEFAULT_FOODS: string[] = [
  '米饭', '面条', '馒头', '面包',
  '鸡胸肉', '牛肉', '猪肉', '鱼',
  '鸡蛋', '牛奶', '酸奶',
  '沙拉', '蔬菜', '水果',
  '咖啡', '茶',
]

export const STRENGTH_GROUPS: StrengthGroup[] = [
  { group: '胸部', items: ['卧推', '哑铃飞鸟', '上斜卧推'] },
  { group: '背部', items: ['划船', '引体向上', '高位下拉', '硬拉'] },
  { group: '肩部', items: ['肩推', '侧平举', '前平举'] },
  { group: '手臂', items: ['哑铃弯举', '三头下压', '锤式弯举'] },
  { group: '腿部', items: ['深蹲', '腿举', '腿弯举', '保加利亚分腿蹲'] },
  { group: '核心', items: ['平板支撑', '卷腹', '俄罗斯转体'] },
]

export const DEFAULT_CARDIO: string[] = [
  '跑步', '爬坡', '椭圆机', '骑行',
  '划船机', '跳绳', '游泳', '快走',
]

// Cardio parameter templates per exercise type
export const CARDIO_PARAMS: Record<string, CardioParamDef[]> = {
  '跑步': [{ key: 'speed', label: '速度', unit: 'km/h' }, { key: 'distance', label: '距离', unit: 'km' }],
  '爬坡': [{ key: 'incline', label: '坡度', unit: '%' }, { key: 'speed', label: '速度', unit: 'km/h' }],
  '椭圆机': [{ key: 'resistance', label: '阻力', unit: '' }],
  '骑行': [{ key: 'speed', label: '速度', unit: 'km/h' }, { key: 'distance', label: '距离', unit: 'km' }],
  '划船机': [{ key: 'resistance', label: '阻力', unit: '' }, { key: 'distance', label: '距离', unit: 'm' }],
  '跳绳': [{ key: 'count', label: '个数', unit: '个' }],
  '游泳': [{ key: 'distance', label: '距离', unit: 'm' }],
  '快走': [{ key: 'speed', label: '速度', unit: 'km/h' }, { key: 'distance', label: '距离', unit: 'km' }],
}

export const DEFAULT_SETTINGS: Settings = {
  dailyExerciseGoal: 60, // minutes
  commonFoods: [...DEFAULT_FOODS],
  commonStrength: STRENGTH_GROUPS.map((g) => ({ group: g.group, items: [...g.items] })),
  commonCardio: [...DEFAULT_CARDIO],
}

export function getAutoMealType(): string {
  const hour: number = new Date().getHours()
  if (hour >= 7 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 17 && hour < 21) return 'dinner'
  return 'snack'
}

export function getMealLabel(key: string): string {
  return MEAL_TYPES.find((m) => m.key === key)?.label ?? key
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getToday(): string {
  return formatDate(new Date())
}

export function getGreeting(): string {
  const hour: number = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function formatTimer(totalSeconds: number): string {
  const m: number = Math.floor(totalSeconds / 60)
  const s: number = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
