import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

function readInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return 'dark'
  if (saved === 'light') return 'light'
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return prefersDark ? 'dark' : 'light'
}

function readBoardShowAllFsLines(): boolean {
  return localStorage.getItem('board.showAllFsLines') === 'true'
}

function readTagColorOverrides(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem('board.tagColorOverrides')
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, Record<string, string>>
  } catch {
    return {}
  }
}

interface UiState {
  theme: ThemeMode
  locale: 'zh-CN' | 'en-US'
  boardShowAllFsLines: boolean
  /** groupId → (tagKey → css color) */
  tagColorOverridesByGroup: Record<string, Record<string, string>>
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: 'zh-CN' | 'en-US') => void
  setBoardShowAllFsLines: (on: boolean) => void
  setTagColorOverride: (groupId: string, tagKey: string, color: string | null) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  locale: (localStorage.getItem('locale') as 'zh-CN' | 'en-US') || 'zh-CN',
  boardShowAllFsLines: readBoardShowAllFsLines(),
  tagColorOverridesByGroup: readTagColorOverrides(),
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
  },
  setBoardShowAllFsLines: (on) => {
    localStorage.setItem('board.showAllFsLines', on ? 'true' : 'false')
    set({ boardShowAllFsLines: on })
  },
  setTagColorOverride: (groupId, tagKey, color) => {
    const key = tagKey.trim().toLowerCase()
    if (!groupId || !key) return
    const next = { ...get().tagColorOverridesByGroup }
    const groupMap = { ...(next[groupId] ?? {}) }
    if (color === null || color === '') {
      delete groupMap[key]
    } else {
      groupMap[key] = color
    }
    if (Object.keys(groupMap).length === 0) {
      delete next[groupId]
    } else {
      next[groupId] = groupMap
    }
    localStorage.setItem('board.tagColorOverrides', JSON.stringify(next))
    set({ tagColorOverridesByGroup: next })
  }
}))

/** AUTO-20：无头截图在同一会话内切换主题时同步 Ant ConfigProvider */
if (typeof window !== 'undefined') {
  window.addEventListener('lanpm-visual-theme', (ev) => {
    const theme = (ev as CustomEvent<ThemeMode>).detail
    if (theme === 'dark' || theme === 'light') useUiStore.getState().setTheme(theme)
  })
}
