import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import useStore from '../store/useStore'
import { MEAL_TYPES, getAutoMealType, getMealLabel, getToday, formatRelativeDate } from '../utils/constants'
import {
  getFoodItems,
  getLastMealItems,
  getFrequentFoodNames,
} from '../utils/food'
import { compressImage } from '../utils/image'
import { saveImage, loadImage, deleteImage, blobToURL } from '../utils/imageDB'
import type { FoodItem, FoodRecord as FoodRecordType } from '../types'

interface FoodItemDraft {
  id: string
  name: string
  note: string
  calories: string
}

function createFoodItemDraft(name = '', note = '', calories = ''): FoodItemDraft {
  return { id: uuidv4(), name, note, calories }
}

export default function FoodRecord() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const records = useStore((s) => s.records)
  const addRecord = useStore((s) => s.addRecord)
  const updateRecord = useStore((s) => s.updateRecord)
  const showToast = useStore((s) => s.showToast)

  const editFood = editId
    ? records.find((record): record is FoodRecordType => record.type === 'food' && record.id === editId) ?? null
    : null

  const initialItems = editFood
    ? getFoodItems(editFood).map((item) => createFoodItemDraft(item.name, item.note ?? '', item.calories?.toString() ?? ''))
    : [createFoodItemDraft()]

  const [category, setCategory] = useState<FoodRecordType['category']>(editFood?.category ?? getAutoMealType() as FoodRecordType['category'])
  const [items, setItems] = useState<FoodItemDraft[]>(initialItems.length > 0 ? initialItems : [createFoodItemDraft()])
  const [photoId, setPhotoId] = useState<string | null>(editFood?.photoId ?? editFood?.photo ?? null)
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [errorItemId, setErrorItemId] = useState<string | null>(null)

  const lastMeal = useMemo(
    () => (editFood ? null : getLastMealItems(records, category, editId)),
    [records, category, editFood, editId],
  )

  const isFormEmpty = items.every(
    (item) => !item.name.trim() && !item.note.trim() && !item.calories.trim(),
  )

  const smartFoods = useMemo(
    () => getFrequentFoodNames(records, 18),
    [records],
  )

  function copyLastMeal() {
    if (!lastMeal) return
    setItems(
      lastMeal.items.map((item) =>
        createFoodItemDraft(item.name, item.note ?? '', item.calories?.toString() ?? ''),
      ),
    )
    showToast(`已复制${getMealLabel(category)}`)
  }

  useEffect(() => {
    if (!photoId) return
    if (photoId.startsWith('data:')) {
      setPhotoURL(photoId)
      return
    }
    loadImage(photoId).then((blob) => {
      if (blob) setPhotoURL(blobToURL(blob))
    })
    return () => { if (photoURL && !photoURL.startsWith('data:')) URL.revokeObjectURL(photoURL) }
  }, [photoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  function updateFoodItem(id: string, patch: Partial<FoodItemDraft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addFoodItem(name = '') {
    setItems((current) => [...current, createFoodItemDraft(name)])
  }

  function removeFoodItem(id: string) {
    setItems((current) => {
      if (current.length === 1) return [createFoodItemDraft()]
      return current.filter((item) => item.id !== id)
    })
  }

  function quickAddFood(name: string) {
    setItems((current) => {
      const emptyIndex = current.findIndex((item) => !item.name.trim() && !item.note.trim() && !item.calories.trim())
      if (emptyIndex >= 0) {
        return current.map((item, index) => (index === emptyIndex ? { ...item, name } : item))
      }
      return [...current, createFoodItemDraft(name)]
    })
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    try {
      const blob = await compressImage(file)
      setPhotoBlob(blob)
      if (photoURL && !photoURL.startsWith('data:')) URL.revokeObjectURL(photoURL)
      setPhotoURL(blobToURL(blob))
      setPhotoId('pending')
    } catch {
      showToast('图片处理失败')
    }
    setPhotoLoading(false)
  }

  function handleRemovePhoto() {
    if (photoURL && !photoURL.startsWith('data:')) URL.revokeObjectURL(photoURL)
    if (editFood?.photoId && !editFood.photoId.startsWith('data:')) {
      deleteImage(editFood.photoId)
    }
    setPhotoId(null)
    setPhotoURL(null)
    setPhotoBlob(null)
  }

  async function handleSave() {
    const normalizedItems: FoodItem[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const name = item.name.trim()
      const note = item.note.trim()
      const caloriesInput = item.calories.trim()

      if (!name && !note && !caloriesInput) continue
      if (!name) {
        showToast(`请输入第 ${i + 1} 个食物名称`)
        setErrorItemId(item.id)
        setTimeout(() => setErrorItemId(null), 1200)
        return
      }

      const calories = caloriesInput ? Number(caloriesInput) : null
      if (caloriesInput && (calories === null || Number.isNaN(calories) || calories < 0)) {
        showToast(`请输入第 ${i + 1} 个食物的有效卡路里`)
        setErrorItemId(item.id)
        setTimeout(() => setErrorItemId(null), 1200)
        return
      }

      normalizedItems.push({ name, note: note || null, calories })
    }

    if (normalizedItems.length === 0) {
      showToast('请至少添加一个食物')
      setErrorItemId(items[0]?.id ?? null)
      setTimeout(() => setErrorItemId(null), 1200)
      return
    }

    let savedPhotoId = null
    if (photoBlob) {
      savedPhotoId = uuidv4()
      await saveImage(savedPhotoId, photoBlob)
      if (editFood?.photoId && !editFood.photoId.startsWith('data:')) {
        deleteImage(editFood.photoId)
      }
    } else if (photoId && photoId !== 'pending') {
      savedPhotoId = photoId
    }

    const data: Omit<FoodRecordType, 'id' | 'createdAt'> = {
      type: 'food',
      date: editFood?.date ?? getToday(),
      time: editFood?.time ?? timeStr,
      category,
      items: normalizedItems,
      photoId: savedPhotoId,
    }

    if (editFood && editId) {
      updateRecord(editId, data)
      showToast('已更新')
    } else {
      addRecord(data)
      showToast('已记录')
    }
    navigate(-1)
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto">
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 safe-top flex items-center justify-between"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: 'inset 0 -0.5px 0 var(--glass-border-light)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-theme-secondary">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{editFood ? '编辑饮食' : '记录饮食'}</h1>
        <button onClick={handleSave} className="font-medium px-2 py-1 text-theme-accent">保存</button>
      </div>

      <div className="px-4 space-y-5 pb-10">
        <div>
          <label className="text-sm font-medium mb-2 block text-theme-secondary">餐类</label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((meal) => (
              <button key={meal.key} onClick={() => setCategory(meal.key as FoodRecordType['category'])}
                className="py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={category === meal.key
                  ? { background: 'linear-gradient(135deg, #60A5FA, #818CF8)', color: '#fff' }
                  : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
                }>
                <div className="text-base mb-0.5">{meal.icon}</div>{meal.label}
              </button>
            ))}
          </div>
        </div>

        {lastMeal && isFormEmpty && (
          <button
            onClick={copyLastMeal}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200"
            style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
          >
            <div className="flex items-center gap-3 text-left">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-theme-accent" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="text-sm font-medium text-theme-primary">复制上次{getMealLabel(category)}</div>
                <div className="text-xs text-theme-tertiary mt-0.5">
                  {formatRelativeDate(lastMeal.date)} · {lastMeal.items.map((i) => i.name).join('、')}
                </div>
              </div>
            </div>
            <span className="text-sm text-theme-accent">复制</span>
          </button>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-sm font-medium block text-theme-secondary">食物列表</label>
              <p className="text-xs mt-1 text-theme-tertiary">从上到下填写这一餐里的所有食物，一次提交。</p>
            </div>
            <button onClick={() => addFoodItem()} className="text-sm px-3 py-1.5 rounded-full"
              style={{ background: 'var(--chip-bg)', color: 'var(--text-accent)', border: '1px solid var(--chip-border)' }}>
              + 添加食物
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="glass-light p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-theme-secondary">食物 {index + 1}</span>
                  <button onClick={() => removeFoodItem(item.id)} className="text-sm px-2 py-1 text-theme-tertiary">
                    删除
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateFoodItem(item.id, { name: e.target.value })}
                    placeholder="食物名称"
                    className={`input-field ${errorItemId === item.id ? 'field-error' : ''}`}
                    autoFocus={!editFood && index === 0}
                  />
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) => updateFoodItem(item.id, { note: e.target.value })}
                    placeholder="备注：份量、做法、口感..."
                    className="input-field"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={item.calories}
                      onChange={(e) => updateFoodItem(item.id, { calories: e.target.value })}
                      placeholder="卡路里"
                      className={`input-field pr-14 ${errorItemId === item.id ? 'field-error' : ''}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-theme-tertiary">kcal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {smartFoods.length > 0 && (
            <div className="mt-3">
              <label className="text-xs mb-2 block text-theme-tertiary">快速添加（按使用频率排序）</label>
              <div className="flex flex-wrap gap-2">
                {smartFoods.map((food) => (
                  <button
                    key={food}
                    onClick={() => quickAddFood(food)}
                    className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                    style={{ background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }}
                  >
                    {food}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-light mb-2 block text-theme-secondary">餐食照片</label>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
          {photoURL ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--glass-border-light)' }}>
              <img src={photoURL} alt="" className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.2)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={handleRemovePhoto}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(220,38,38,0.5)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.15)' }}>&times;</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={photoLoading}
              className="w-full py-6 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200"
              style={{ background: 'var(--glass-input)', border: '1px dashed var(--glass-border-light)' }}>
              {photoLoading ? <span className="text-sm text-theme-tertiary">处理中...</span> : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-theme-tertiary" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm text-theme-tertiary">拍照或选择照片</span>
                </>
              )}
            </button>
          )}
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          {editFood ? '更新这一餐' : '保存这一餐'}
        </button>
      </div>
    </div>
  )
}
