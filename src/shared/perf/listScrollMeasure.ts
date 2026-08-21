/** Four long-list surfaces for SPRINT-60 scroll measurement (chat / board / files / gantt). */

export const LIST_SCROLL_GROUP_ID = 'demo-project'

export const LIST_SCROLL_NAV_FILE = 'nav-preferences.json'

/** Unhide so measure:list-scroll can click BottomNav tabs (defaults hide files + gantt). */
export const LIST_SCROLL_UNHIDE_VIEWS = ['files', 'gantt'] as const

export type ListScrollView = 'chat' | 'board' | 'files' | 'gantt'

export type ListScrollKind = 'messages' | 'tasks' | 'files'

export interface ListScrollSurface {
  view: ListScrollView
  /** Playwright / CDP scroll target */
  testId: string
  minCount: number
  kind: ListScrollKind
}

export const LIST_SCROLL_SURFACES: readonly ListScrollSurface[] = [
  { view: 'chat', testId: 'chat-message-list', minCount: 100, kind: 'messages' },
  { view: 'board', testId: 'board-column-scroll', minCount: 80, kind: 'tasks' },
  { view: 'files', testId: 'files-table-scroll', minCount: 80, kind: 'files' },
  { view: 'gantt', testId: 'gantt-chart-scroll', minCount: 80, kind: 'tasks' }
]

export function listScrollSurfaceByView(view: ListScrollView): ListScrollSurface {
  const found = LIST_SCROLL_SURFACES.find((s) => s.view === view)
  if (!found) throw new Error(`unknown list-scroll view: ${view}`)
  return found
}

/** Global nav prefs: show files + gantt, keep calendar/whiteboard hidden. */
export function listScrollNavPreferencesDocument(): {
  global: {
    hiddenViews: string[]
    order: string[]
    hiddenContributedRoutes: string[]
    contributedOrder: string[]
  }
  byGroup: Record<string, never>
} {
  return {
    global: {
      hiddenViews: ['whiteboard', 'calendar'],
      order: ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files'],
      hiddenContributedRoutes: ['mindmap'],
      contributedOrder: []
    },
    byGroup: {}
  }
}
