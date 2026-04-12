const THEME_KEY = 'fitlog_theme'

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || 'auto'
}

export function setStoredTheme(mode) {
  localStorage.setItem(THEME_KEY, mode)
}

export function resolveTheme(mode) {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return mode
}

export function applyTheme(mode) {
  const resolved = resolveTheme(mode)
  document.documentElement.setAttribute('data-theme', resolved)
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.content = resolved === 'light' ? '#F0F2F5' : '#0a0a1a'
  }
}
