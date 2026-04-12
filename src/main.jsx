import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { getStoredTheme, applyTheme } from './utils/theme'

// Apply theme immediately to avoid flash
applyTheme(getStoredTheme())

// Listen for system color scheme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  const mode = getStoredTheme()
  if (mode === 'auto') applyTheme('auto')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
