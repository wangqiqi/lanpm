import { describe, expect, it } from 'vitest'
import {
  getDisallowedTaskPatchFields,
  TASK_PATCH_WHITELIST_FIELDS
} from '../../../src/shared/plugin/taskPatchWhitelist.ts'

describe('taskPatchWhitelist', () => {
  it('defines whitelist fields', () => {
    expect(TASK_PATCH_WHITELIST_FIELDS).toEqual([
      'title',
      'status',
      'progressPercent',
      'priority',
      'tags',
      'storyPoints',
      'iterationId'
    ])
  })

  it('allows whitelist keys only', () => {
    expect(getDisallowedTaskPatchFields({})).toEqual([])
    expect(getDisallowedTaskPatchFields({ title: 'a', status: 'todo' })).toEqual([])
    expect(getDisallowedTaskPatchFields({ description: 'x' })).toEqual(['description'])
    expect(getDisallowedTaskPatchFields({ assigneeUserId: 'u1', tags: [] })).toEqual([
      'assigneeUserId'
    ])
  })
})
