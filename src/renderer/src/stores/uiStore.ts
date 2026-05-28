import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

function readInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return 'dark'
  if (saved === 'light') return 'light'
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return prefersDark ? 'dark' : 'light'
}

interface UiState {
  theme: ThemeMode
  locale: 'zh-CN' | 'en-US'
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: 'zh-CN' | 'en-US') => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  locale: (localStorage.getItem('locale') as 'zh-CN' | 'en-US') || 'zh-CN',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  setLocale: (locale) => {
    localStorage.setItem('locale', locale)
    set({ locale })
  }
}))
