import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useStore from '../store/useStore'
import { getToday } from '../utils/constants'
import PageBackground from '../components/PageBackground'
import type { ReflectionRecord } from '../types'

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function Feeling() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const records = useStore((s) => s.records)
  const addRecord = useStore((s) => s.addRecord)
  const updateRecord = useStore((s) => s.updateRecord)
  const showToast = useStore((s) => s.showToast)

  const today = getToday()

  const targetRecord = useMemo(() => {
    if (editId) {
      return records.find((record): record is ReflectionRecord => record.type === 'reflection' && record.id === editId) ?? null
    }

    return records
      .filter((record): record is ReflectionRecord => record.type === 'reflection' && record.date === today)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  }, [editId, records, today])

  const [content, setContent] = useState(targetRecord?.content ?? '')

  useEffect(() => {
    setContent(targetRecord?.content ?? '')
  }, [targetRecord?.id, targetRecord?.content])

  function handleSave() {
    const trimmed = content.trim()
    if (!trimmed) {
      showToast('写点今天的感想再保存')
      return
    }

    const now = new Date()
    const payload = {
      type: 'reflection' as const,
      date: targetRecord?.date ?? today,
      time: formatTime(now),
      content: trimmed,
    }

    if (targetRecord) {
      updateRecord(targetRecord.id, payload)
      showToast('感想已更新')
    } else {
      addRecord(payload)
      showToast('感想已保存')
    }
    navigate(-1)
  }

  const heading = editId ? '编辑感想' : '今日感想'

  return (
    <>
      <PageBackground src="/bg-feeling.png" />
      <div className="min-h-screen max-w-lg mx-auto">
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 safe-top flex items-center justify-between"
        style={{ background: 'var(--header-bg)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: 'inset 0 -0.5px 0 var(--glass-border-light)' }}>
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-theme-secondary">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{heading}</h1>
        <button onClick={handleSave} className="font-medium px-2 py-1 text-theme-accent">保存</button>
      </div>

      <div className="px-4 pt-5 pb-10">
        <div className="glass p-5 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold"
              style={{ background: 'rgba(96, 165, 250, 0.12)', color: 'var(--text-accent)', border: '1px solid rgba(96, 165, 250, 0.18)' }}
            >
              F
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-secondary">Freestyle</h2>
              <p className="text-xs mt-1 text-theme-tertiary">把今天的状态、想法、碎片记录下来。</p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今天训练怎么样？饮食有没有控制住？或者随便写点什么。"
            className="input-field min-h-[220px] py-4 resize-none leading-7"
          />

          <div className="flex items-center justify-between mt-3 text-xs text-theme-tertiary">
            <span>{targetRecord ? `记录日期 ${targetRecord.date}` : `记录日期 ${today}`}</span>
            <span>{content.trim().length} 字</span>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary w-full mt-5">
          {targetRecord ? '更新感想' : '保存感想'}
        </button>
      </div>
      </div>
    </>
  )
}
