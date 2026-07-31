import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NAV_PREFERENCES,
  isViewHideLocked,
  isViewVisibleForGroup,
  normalizeNavPreferences,
  resolveVisibleViews,
  sanitizeNavPreferences
} from '@shared/navigation/navPreferences'

describe('normalizeNavPreferences', () => {
  it('returns defaults for invalid input', () => {
    expect(normalizeNavPreferences(null).order).toEqual(DEFAULT_NAV_PREFERENCES.order)
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
})

describe('sanitizeNavPreferences', () => {
  it('keeps chat visible and restores a task entry when both hidden', () => {
    const prefs = sanitizeNavPreferences({
      hiddenViews: ['chat', 'board', 'tree'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(prefs.hiddenViews).not.toContain('chat')
    expect(prefs.hiddenViews).not.toContain('board')
    expect(prefs.hiddenViews).toContain('tree')
  })

  it('allows hiding board when tree remains', () => {
    const prefs = sanitizeNavPreferences({
      hiddenViews: ['board'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(prefs.hiddenViews).toEqual(['board'])
  })
})

describe('resolveVisibleViews', () => {
  it('filters hidden views for project groups', () => {
    const prefs = sanitizeNavPreferences({
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
      hiddenViews: ['whiteboard'],
      order: DEFAULT_NAV_PREFERENCES.order
    })
    expect(isViewVisibleForGroup('project', prefs, 'whiteboard')).toBe(false)
  })
})
