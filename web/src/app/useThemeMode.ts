import { useLayoutEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'android-interview-trainer:theme'

function systemMode(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialMode(): ThemeMode {
  const storedMode = localStorage.getItem(STORAGE_KEY)

  return storedMode === 'dark' || storedMode === 'light' ? storedMode : systemMode()
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(initialMode)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return {
    mode,
    toggle: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }
}
