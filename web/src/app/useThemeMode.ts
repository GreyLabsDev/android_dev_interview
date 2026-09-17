import { useEffect, useLayoutEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'android-interview-trainer:theme'

function systemMode(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialPreference(): ThemeMode | null {
  const storedPreference = localStorage.getItem(STORAGE_KEY)

  return storedPreference === 'dark' || storedPreference === 'light'
    ? storedPreference
    : null
}

export function useThemeMode() {
  const [preference, setPreference] = useState<ThemeMode | null>(initialPreference)
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(systemMode)
  const mode = preference ?? systemTheme

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode

    if (preference === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, preference)
    }
  }, [mode, preference])

  useEffect(() => {
    if (preference !== null) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    mediaQuery.addEventListener('change', updateSystemTheme)
    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [preference])

  return {
    mode,
    toggle: () => setPreference((current) => (current ?? systemTheme) === 'dark' ? 'light' : 'dark'),
  }
}
