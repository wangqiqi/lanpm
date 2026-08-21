import { describe, expect, it } from 'vitest'
import {
  LIST_SCROLL_SURFACES,
  listScrollNavPreferencesDocument,
  listScrollSurfaceByView
} from '../../../src/shared/perf/listScrollMeasure'

describe('listScrollMeasure', () => {
  it('covers four views with min counts', () => {
    expect(LIST_SCROLL_SURFACES.map((s) => s.view)).toEqual(['chat', 'board', 'files', 'gantt'])
    expect(listScrollSurfaceByView('chat').minCount).toBe(100)
    expect(listScrollSurfaceByView('board').minCount).toBe(80)
    expect(listScrollSurfaceByView('gantt').kind).toBe('tasks')
  })

  it('unhides files and gantt in nav prefs', () => {
    const doc = listScrollNavPreferencesDocument()
    expect(doc.global.hiddenViews).not.toContain('files')
    expect(doc.global.hiddenViews).not.toContain('gantt')
  })
})
