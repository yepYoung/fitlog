import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useStore from '../store/useStore'
import { MEAL_TYPES, getAutoMealType, getToday } from '../utils/constants'
import { compressImage } from '../utils/image'

export default function FoodRecord() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const fileInputRef = useRef(null)

  const records = useStore((s) => s.records)
  const addRecord = useStore((s) => s.addRecord)
  const updateRecord = useStore((s) => s.updateRecord)
  const showToast = useStore((s) => s.showToast)
  const commonFoods = useStore((s) => s.settings.commonFoods)

  const editRecord = editId ? records.find((r) => r.id === editId) : null

  const [category, setCategory] = useState(editRecord?.category ?? getAutoMealType())
  const [name, setName] = useState(editRecord?.name ?? '')
  const [note, setNote] = useState(editRecord?.note ?? '')
  const [photo, setPhoto] = useState(editRecord?.photo ?? null)
  const [photoLoading, setPhotoLoading] = useState(false)

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    try { setPhoto(await compressImage(file)) } catch { showToast('图片处理失败') }
    setPhotoLoading(false)
  }

  function handleSave() {
    if (!name.trim()) { showToast('请输入食物名称'); return }
    const data = {
      type: 'food',
      date: editRecord?.date ?? getToday(),
      time: editRecord?.time ?? timeStr,
      category,
      name: name.trim(),
      note: note.trim() || null,
      photo: photo || null,
    }
    if (editRecord) { updateRecord(editId, data); showToast('已更新') }
    else { addRecord(data); showToast('已记录') }
    navigate(-1)
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto">
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 safe-top flex items-center justify-between"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{editRecord ? '编辑饮食' : '记录饮食'}</h1>
        <button onClick={handleSave} className="font-medium px-2 py-1" style={{ color: 'var(--text-accent)' }}>保存</button>
      </div>

      <div className="px-4 space-y-5 pb-10">
        {/* Meal Type */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>餐类</label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((meal) => (
              <button key={meal.key} onClick={() => setCategory(meal.key)}
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

        {/* Food Name */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>食物名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="输入食物名称" className="input-field" autoFocus={!editRecord} />
          {commonFoods.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {commonFoods.map((food) => (
                <button key={food} onClick={() => setName(food)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                  style={name === food
                    ? { background: 'rgba(96,165,250,0.2)', color: 'var(--text-accent)', border: '1px solid rgba(96,165,250,0.3)' }
                    : { background: 'var(--chip-bg)', color: 'var(--chip-text)', border: '1px solid var(--chip-border)' }
                  }>{food}</button>
              ))}
            </div>
          )}
        </div>

        {/* Photo */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            照片 <span style={{ color: 'var(--text-tertiary)' }}>(选填)</span>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
          {photo ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--glass-border-light)' }}>
              <img src={photo} alt="" className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={() => setPhoto(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(220,38,38,0.6)', backdropFilter: 'blur(8px)' }}>&times;</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={photoLoading}
              className="w-full py-6 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200"
              style={{ background: 'var(--glass-input)', border: '1px dashed var(--glass-border-light)' }}>
              {photoLoading ? <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>处理中...</span> : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }}>
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>拍照或选择照片</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            备注 <span style={{ color: 'var(--text-tertiary)' }}>(选填)</span>
          </label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="份量、口感..." className="input-field" />
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-4">
          {editRecord ? '更新记录' : '保存记录'}
        </button>
      </div>
    </div>
  )
}
