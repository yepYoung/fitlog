export type ThemeMode = 'auto' | 'dark' | 'light'

const THEME_KEY: string = 'fitlog_theme'

export function getStoredTheme(): ThemeMode {
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'auto'
}

export function setStoredTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode)
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return mode
}

export function applyTheme(mode: ThemeMode): void {
  const resolved: 'light' | 'dark' = resolveTheme(mode)
  document.documentElement.setAttribute('data-theme', resolved)
  // Update meta theme-color
  const meta: HTMLMetaElement | null = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = resolved === 'light' ? '#F0F2F5' : '#0a0a1a'
  }
}
