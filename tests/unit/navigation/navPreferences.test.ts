import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NAV_PREFERENCES,
  hasGroupNavOverride,
  isContributedRouteVisible,
  isViewHideLocked,
  isViewVisibleForGroup,
  normalizeNavPreferences,
  normalizeNavPreferencesDocument,
  resolveNavPreferencesForGroup,
  resolveVisibleContributedRoutes,
  resolveVisibleViews,
  sanitizeNavPreferences
} from '@shared/navigation/navPreferences'

describe('normalizeNavPreferences', () => {
  it('returns defaults for invalid input', () => {
    expect(normalizeNavPreferences(null).order).toEqual(DEFAULT_NAV_PREFERENCES.order)
    expect(normalizeNavPreferences(null).hiddenViews).toEqual(['files', 'whiteboard'])
    expect(normalizeNavPreferences(null).hiddenContributedRoutes).toEqual(['mindmap'])
    expect(normalizeNavPreferences(null).contributedOrder).toEqual([])
  })

  it('defaults hide files/whiteboard tabs and mindmap contributed route (SPRINT-15 IA)', () => {
    expect(DEFAULT_NAV_PREFERENCES.hiddenViews).toEqual(['files', 'whiteboard'])
    expect(DEFAULT_NAV_PREFERENCES.hiddenContributedRoutes).toEqual(['mindmap'])
    const visible = resolveVisibleViews('project', DEFAULT_NAV_PREFERENCES)
    expect(visible).not.toContain('files')
    expect(visible).not.toContain('whiteboard')
    expect(isContributedRouteVisible(DEFAULT_NAV_PREFERENCES, 'mindmap')).toBe(false)
  })

  it('dedupes order and hiddenViews', () => {
    const prefs = normalizeNavPreferences({
      hiddenViews: ['gantt', 'gantt'],
      order: ['files', 'chat', 'board']
    })
    expect(prefs.hiddenViews).toEqual(['gantt'])
    expect(prefs.order.slice(0, 3)).toEqual(['files', 'chat', 'board'])
    expect(prefs.order).toContain('tree')
  })

  it('normalizes contributed route prefs', () => {
    const prefs = normalizeNavPreferences({
      hiddenContributedRoutes: ['mindmap', 'mindmap', 'BAD'],
      contributedOrder: ['form', 'mindmap']
    })
    expect(prefs.hiddenContributedRoutes).toEqual(['mindmap'])
    expect(prefs.contributedOrder).toEqual(['form', 'mindmap'])
  })
})

describe('sanitizeNavPreferences', () => {
  it('keeps chat visible and restores a task entry when both hidden', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['chat', 'board', 'tree'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(prefs.hiddenViews).not.toContain('chat')
    expect(prefs.hiddenViews).not.toContain('board')
    expect(prefs.hiddenViews).toContain('tree')
  })

  it('allows hiding board when tree remains', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['board'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(prefs.hiddenViews).toEqual(['board'])
  })
})

describe('resolveVisibleViews', () => {
  it('filters hidden views for project groups', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['gantt', 'calendar'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    const visible = resolveVisibleViews('project', prefs)
    expect(visible).not.toContain('gantt')
    expect(visible).not.toContain('calendar')
    expect(visible).toContain('chat')
  })

  it('respects function group tabRules', () => {
    const visible = resolveVisibleViews('function', DEFAULT_NAV_PREFERENCES)
    expect(visible).toEqual(['chat'])
  })

  it('function group can show files when user unhides in preferences', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['whiteboard'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    const visible = resolveVisibleViews('function', prefs)
    expect(visible).toEqual(['chat', 'files'])
  })

  it('dm groups only show chat', () => {
    const visible = resolveVisibleViews('anonymous', DEFAULT_NAV_PREFERENCES, 'dm:a__b')
    expect(visible).toEqual(['chat'])
  })
})

describe('isViewHideLocked', () => {
  it('locks chat and last task entry', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['board'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(isViewHideLocked(prefs, 'chat')).toBe(true)
    expect(isViewHideLocked(prefs, 'tree')).toBe(true)
    expect(isViewHideLocked(prefs, 'gantt')).toBe(false)
  })
})

describe('isViewVisibleForGroup', () => {
  it('returns false for hidden project tab', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['whiteboard'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(isViewVisibleForGroup('project', prefs, 'whiteboard')).toBe(false)
  })
})

describe('resolveVisibleContributedRoutes', () => {
  it('hides and orders known plugin routes', () => {
    const prefs = normalizeNavPreferences({
      hiddenContributedRoutes: ['mindmap'],
      contributedOrder: ['form', 'mindmap', 'extra']
    })
    expect(resolveVisibleContributedRoutes(prefs, ['mindmap', 'form', 'extra'])).toEqual([
      'form',
      'extra'
    ])
  })

  it('skips unknown routes while keeping prefs', () => {
    const prefs = normalizeNavPreferences({
      contributedOrder: ['gone', 'mindmap']
    })
    expect(resolveVisibleContributedRoutes(prefs, ['mindmap'])).toEqual(['mindmap'])
    expect(prefs.contributedOrder).toContain('gone')
  })
})

describe('isContributedRouteVisible', () => {
  it('returns false when route is hidden', () => {
    const prefs = normalizeNavPreferences({
      hiddenContributedRoutes: ['mindmap']
    })
    expect(isContributedRouteVisible(prefs, 'mindmap')).toBe(false)
    expect(isContributedRouteVisible(prefs, 'form')).toBe(true)
  })
})

describe('normalizeNavPreferencesDocument', () => {
  it('migrates legacy flat NavPreferences JSON', () => {
    const doc = normalizeNavPreferencesDocument({
      hiddenViews: ['gantt'],
      order: ['chat', 'board']
    })
    expect(doc.byGroup).toEqual({})
    expect(doc.global.hiddenViews).toEqual(['gantt'])
  })

  it('reads document with byGroup overrides', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: [], order: DEFAULT_NAV_PREFERENCES.order },
      byGroup: {
        'grp-a': { hiddenViews: ['whiteboard'], order: DEFAULT_NAV_PREFERENCES.order }
      }
    })
    expect(hasGroupNavOverride(doc, 'grp-a')).toBe(true)
    expect(hasGroupNavOverride(doc, 'grp-b')).toBe(false)
  })
})

describe('resolveNavPreferencesForGroup', () => {
  it('falls back to global when no override', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: ['calendar'], order: DEFAULT_NAV_PREFERENCES.order }
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1')
    expect(resolved.hiddenViews).toEqual(['calendar'])
  })

  it('uses full group override when present', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: ['calendar'], order: DEFAULT_NAV_PREFERENCES.order },
      byGroup: {
        'grp-1': { hiddenViews: ['gantt'], order: DEFAULT_NAV_PREFERENCES.order }
      }
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1')
    expect(resolved.hiddenViews).toEqual(['gantt'])
    expect(resolved.hiddenViews).not.toContain('calendar')
  })
})
