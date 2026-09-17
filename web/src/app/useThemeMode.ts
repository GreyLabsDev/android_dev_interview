import { useLayoutEffect, useState } from 'react'

export type ThemeMode = 'system' | 'dark'

const STORAGE_KEY = 'android-interview-trainer:theme'

function initialMode(): ThemeMode {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'system'
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(initialMode)

  useLayoutEffect(() => {
    if (mode === 'dark') {
      document.documentElement.dataset.theme = 'dark'
    } else {
      delete document.documentElement.dataset.theme
    }
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return {
    mode,
    toggle: () => setMode((current) => (current === 'dark' ? 'system' : 'dark')),
  }
}
