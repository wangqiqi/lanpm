import { describe, expect, it } from 'vitest'
import {
  defaultViewForGroup,
  isViewAllowedForGroup,
  shouldHighlightCockpit
} from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'

const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files']

describe('isViewAllowedForGroup', () => {
  it.each([
    ['project', 'board', true],
    ['project', 'gantt', true],
    ['project', 'calendar', true],
    ['project', 'whiteboard', true],
    ['function', 'board', false],
    ['function', 'calendar', false],
    ['function', 'whiteboard', false],
    ['function', 'files', true],
    ['anonymous', 'chat', true],
    ['anonymous', 'files', false]
  ] as const)('%s / %s => %s', (type, view, expected) => {
    expect(isViewAllowedForGroup(type, view)).toBe(expected)
  })

  it('dm groups only allow chat', () => {
    const dmId = 'dm:demo-alice__demo-bob'
    for (const view of views) {
      expect(isViewAllowedForGroup('anonymous', view, dmId)).toBe(view === 'chat')
    }
  })
})

describe('defaultViewForGroup', () => {
  it('project defaults to board', () => {
    expect(defaultViewForGroup('project')).toBe('board')
  })

  it.each(['function', 'anonymous'] as const)('%s defaults to chat', (type) => {
    expect(defaultViewForGroup(type)).toBe('chat')
  })
})

describe('shouldHighlightCockpit', () => {
  it('is false without project groups', () => {
    expect(shouldHighlightCockpit([])).toBe(false)
    expect(shouldHighlightCockpit([{ type: 'anonymous' }])).toBe(false)
  })

  it('is true when any project group exists', () => {
    expect(shouldHighlightCockpit([{ type: 'anonymous' }, { type: 'project' }])).toBe(true)
  })
})
