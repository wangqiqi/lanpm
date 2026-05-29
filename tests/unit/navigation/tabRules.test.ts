import { describe, expect, it } from 'vitest'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'

const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'files']

describe('isViewAllowedForGroup', () => {
  it.each([
    ['project', 'board', true],
    ['project', 'gantt', true],
    ['function', 'board', false],
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
