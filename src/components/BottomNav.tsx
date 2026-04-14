import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface NavTab {
  key: string
  label: string
  icon: (color: string) => ReactNode
}

const tabs: NavTab[] = [
  {
    key: '/',
    label: '首页',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={c} strokeWidth={1.8}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: '/feeling',
    label: '感想',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 20V5.5H17" />
        <path d="M9 11.5H15.5" />
      </svg>
    ),
  },
  {
    key: '/history',
    label: '历史',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={c} strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: '/stats',
    label: '统计',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={c} strokeWidth={1.8}>
        <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: '/settings',
    label: '设置',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={c} strokeWidth={1.8}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid var(--glass-border-light)',
        boxShadow: 'inset 0 0.5px 0 var(--glass-highlight), 0 -4px 20px rgba(0,0,0,0.15)',
      }}>
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.key
          const color = active ? 'var(--text-accent)' : 'var(--text-tertiary)'
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.key)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-200"
            >
              {tab.icon(color)}
              <span className="text-xs transition-colors duration-200"
                style={{ color, fontWeight: active ? 600 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
