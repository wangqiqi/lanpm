import { describe, expect, it } from 'vitest'
import {
  LIST_SCROLL_SURFACES,
  listScrollNavPreferencesDocument,
  listScrollSurfaceByView,
  listScrollVerdict
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

  it('GO only when a scrollable surface exceeds 50ms p95 or long task', () => {
    expect(
      listScrollVerdict([{ view: 'chat', scrollable: true, frameP95Ms: 16, longTaskMaxMs: 0 }])
    ).toBe('NO-GO')
    expect(
      listScrollVerdict([{ view: 'chat', scrollable: true, frameP95Ms: 50, longTaskMaxMs: 0 }])
    ).toBe('GO')
    expect(
      listScrollVerdict([{ view: 'board', scrollable: false, frameP95Ms: 80, longTaskMaxMs: 80 }])
    ).toBe('NO-GO')
  })
})
