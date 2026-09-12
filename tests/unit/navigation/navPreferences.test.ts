import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HIDDEN_VIEWS,
  DEFAULT_NAV_PREFERENCES,
  hasGroupNavOverride,
  isContributedRouteVisible,
  isViewHideLocked,
  isViewVisibleForGroup,
  normalizeNavPreferences,
  normalizeNavPreferencesDocument,
  rawNavDocumentNeedsV196Writeback,
  resolveNavPreferencesForGroup,
  resolveVisibleContributedRoutes,
  resolveVisibleViews,
  sanitizeNavPreferences,
  upgradeV196HiddenViews
} from '@shared/navigation/navPreferences'

describe('normalizeNavPreferences', () => {
  it('returns defaults for invalid input', () => {
    expect(normalizeNavPreferences(null).order).toEqual(DEFAULT_NAV_PREFERENCES.order)
    expect(normalizeNavPreferences(null).hiddenViews).toEqual(DEFAULT_HIDDEN_VIEWS)
    expect(normalizeNavPreferences(null).hiddenContributedRoutes).toEqual(['mindmap'])
    expect(normalizeNavPreferences(null).contributedOrder).toEqual([])
  })

  it('defaults hide files/whiteboard/gantt/calendar; project bar is chat/board/tree (SPRINT-45)', () => {
    expect(DEFAULT_NAV_PREFERENCES.hiddenViews).toEqual(DEFAULT_HIDDEN_VIEWS)
    expect(DEFAULT_NAV_PREFERENCES.hiddenContributedRoutes).toEqual(['mindmap'])
    const visible = resolveVisibleViews('project', DEFAULT_NAV_PREFERENCES)
    expect(visible).toEqual(['chat', 'board', 'tree'])
    expect(isContributedRouteVisible(DEFAULT_NAV_PREFERENCES, 'mindmap')).toBe(false)
  })

  it('dedupes order and hiddenViews', () => {
    const prefs = normalizeNavPreferences({
      hiddenViews: ['gantt', 'gantt'],
      order: ['files', 'chat', 'board']
    })
    expect(prefs.hiddenViews).toEqual(['gantt', 'whiteboard'])
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

describe('upgradeV196HiddenViews', () => {
  it('upgrades exact files+whiteboard fingerprint', () => {
    expect(upgradeV196HiddenViews(['whiteboard', 'files'])).toEqual(DEFAULT_HIDDEN_VIEWS)
    expect(rawNavDocumentNeedsV196Writeback({ hiddenViews: ['files', 'whiteboard'] })).toBe(true)
    expect(
      rawNavDocumentNeedsV196Writeback({
        global: { hiddenViews: ['files', 'whiteboard'] },
        byGroup: {}
      })
    ).toBe(true)
  })

  it('does not upgrade customized hidden sets', () => {
    expect(upgradeV196HiddenViews(['files'])).toEqual(['files'])
    expect(upgradeV196HiddenViews(['files', 'whiteboard', 'gantt'])).toEqual([
      'files',
      'whiteboard',
      'gantt'
    ])
    expect(upgradeV196HiddenViews(['files', 'whiteboard', 'gantt', 'calendar'])).toEqual(
      DEFAULT_HIDDEN_VIEWS
    )
    expect(
      rawNavDocumentNeedsV196Writeback({
        global: { hiddenViews: ['files', 'whiteboard', 'gantt', 'calendar'] }
      })
    ).toBe(false)
    expect(
      rawNavDocumentNeedsV196Writeback({
        global: { hiddenViews: [] }
      })
    ).toBe(false)
  })

  it('upgrades byGroup fingerprint independently', () => {
    expect(
      rawNavDocumentNeedsV196Writeback({
        global: { hiddenViews: ['calendar'] },
        byGroup: { 'grp-a': { hiddenViews: ['files', 'whiteboard'] } }
      })
    ).toBe(true)
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
    expect(prefs.hiddenViews).toEqual(['board', 'whiteboard'])
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
  it('locks chat, last task entry, and canvas views', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: ['board'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(isViewHideLocked(prefs, 'chat')).toBe(true)
    expect(isViewHideLocked(prefs, 'tree')).toBe(true)
    expect(isViewHideLocked(prefs, 'gantt')).toBe(false)
    expect(isViewHideLocked(prefs, 'whiteboard')).toBe(true)
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
    expect(resolveVisibleContributedRoutes(prefs, ['mindmap'])).toEqual([])
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

  it('never treats mindmap as a visible tab even if prefs omit it from hidden', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenContributedRoutes: []
    })
    expect(prefs.hiddenContributedRoutes).toContain('mindmap')
    expect(isContributedRouteVisible(prefs, 'mindmap')).toBe(false)
  })
})

describe('normalizeNavPreferencesDocument', () => {
  it('migrates legacy flat NavPreferences JSON', () => {
    const doc = normalizeNavPreferencesDocument({
      hiddenViews: ['gantt'],
      order: ['chat', 'board']
    })
    expect(doc.byGroup).toEqual({})
    expect(doc.global.hiddenViews).toEqual(['gantt', 'whiteboard'])
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

describe('canvas never bottom nav (SPRINT-46)', () => {
  it('omits whiteboard from project tabs even when prefs try to show it', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenViews: []
    })
    expect(prefs.hiddenViews).toContain('whiteboard')
    expect(resolveVisibleViews('project', prefs)).not.toContain('whiteboard')
    expect(resolveVisibleViews('project', { ...DEFAULT_NAV_PREFERENCES, hiddenViews: [] })).not.toContain(
      'whiteboard'
    )
  })

  it('omits mindmap from contributed tabs even when prefs try to show it', () => {
    const prefs = sanitizeNavPreferences({
      ...DEFAULT_NAV_PREFERENCES,
      hiddenContributedRoutes: []
    })
    expect(resolveVisibleContributedRoutes(prefs, ['mindmap', 'form'])).toEqual(['form'])
  })
})

describe('resolveNavPreferencesForGroup', () => {
  it('falls back to global when no override and no groupType', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: ['calendar'], order: DEFAULT_NAV_PREFERENCES.order }
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1')
    expect(resolved.hiddenViews).toEqual(['calendar', 'whiteboard'])
  })

  it('uses full group override when present', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: ['calendar'], order: DEFAULT_NAV_PREFERENCES.order },
      byGroup: {
        'grp-1': { hiddenViews: ['gantt'], order: DEFAULT_NAV_PREFERENCES.order }
      }
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1', 'project')
    expect(resolved.hiddenViews).toEqual(['gantt', 'whiteboard'])
    expect(resolved.hiddenViews).not.toContain('calendar')
  })

  it('shows gantt on project bottom bar when global prefs unhide it', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: ['calendar'], order: DEFAULT_NAV_PREFERENCES.order },
      byGroup: {}
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1', 'project')
    expect(resolveVisibleViews('project', resolved)).toContain('gantt')
    expect(resolveVisibleViews('project', resolved)).not.toContain('calendar')
  })

  it('group override can hide gantt while global unhides schedule tabs', () => {
    const doc = normalizeNavPreferencesDocument({
      global: { hiddenViews: [], order: DEFAULT_NAV_PREFERENCES.order },
      byGroup: {
        'grp-1': { hiddenViews: ['gantt'], order: DEFAULT_NAV_PREFERENCES.order }
      }
    })
    const resolved = resolveNavPreferencesForGroup(doc, 'grp-1', 'project')
    expect(resolveVisibleViews('project', resolved)).not.toContain('gantt')
    expect(resolveVisibleViews('project', resolved)).toContain('calendar')
  })
})
