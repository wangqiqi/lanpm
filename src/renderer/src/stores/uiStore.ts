import { create } from 'zustand'
import { markDiscoverCoachmarkSeen } from '@shared/discover/discoverCoachmark'
import { readInitialTheme, type ThemeMode } from '@renderer/theme/initialTheme'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import type { AppLocale } from '@shared/locale/types'

export type { ThemeMode }

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
  locale: AppLocale
  boardShowAllFsLines: boolean
  /** groupId → (tagKey → css color) */
  tagColorOverridesByGroup: Record<string, Record<string, string>>
  /** Whiteboard immersive chrome-off mode */
  whiteboardZen: boolean
  /** TopBar 应打开发现弹窗（零群组首启等） */
  discoverOpenPending: boolean
  /** 顶栏「发现」Coachmark 待展示 */
  discoverCoachmarkPending: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLocale: (locale: AppLocale) => void
  setBoardShowAllFsLines: (on: boolean) => void
  setTagColorOverride: (groupId: string, tagKey: string, color: string | null) => void
  setWhiteboardZen: (on: boolean) => void
  requestDiscoverOpen: () => void
  ackDiscoverOpen: () => void
  requestDiscoverCoachmark: () => void
  ackDiscoverCoachmark: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  locale: (localStorage.getItem('locale') as AppLocale) || 'zh-CN',
  boardShowAllFsLines: readBoardShowAllFsLines(),
  tagColorOverridesByGroup: readTagColorOverrides(),
  whiteboardZen: false,
  discoverOpenPending: false,
  discoverCoachmarkPending: false,
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
    try {
      void getLanpmApi().locale.set(locale)
    } catch {
      /* browser stub */
    }
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
  },
  setWhiteboardZen: (on) => set({ whiteboardZen: on }),
  requestDiscoverOpen: () => set({ discoverOpenPending: true }),
  ackDiscoverOpen: () => set({ discoverOpenPending: false }),
  requestDiscoverCoachmark: () => set({ discoverCoachmarkPending: true }),
  ackDiscoverCoachmark: () => {
    markDiscoverCoachmarkSeen()
    set({ discoverCoachmarkPending: false })
  }
}))

/** AUTO-20：无头截图在同一会话内切换主题时同步 Ant ConfigProvider */
if (typeof window !== 'undefined') {
  window.addEventListener('lanpm-visual-theme', (ev) => {
    const theme = (ev as CustomEvent<ThemeMode>).detail
    if (theme === 'dark' || theme === 'light') useUiStore.getState().setTheme(theme)
  })
}
