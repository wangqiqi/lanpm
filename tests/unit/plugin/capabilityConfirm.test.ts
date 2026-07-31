import { describe, expect, it } from 'vitest'
import {
  HUMAN_REVIEW_CAPABILITY_IDS,
  isCapabilityPendingConfirm,
  isHumanReviewCapability
} from '../../../src/shared/plugin/capabilityConfirm.ts'
import {
  getDisallowedTaskCreateFields,
  parseTaskCreateInput,
  TASK_CREATE_WHITELIST_FIELDS
} from '../../../src/shared/plugin/taskCreateWhitelist.ts'

describe('capabilityConfirm', () => {
  it('marks create/patch/move as human-review', () => {
    expect([...HUMAN_REVIEW_CAPABILITY_IDS]).toEqual([
      'task.create',
      'task.patch',
      'board.moveTask'
    ])
    expect(isHumanReviewCapability('task.create')).toBe(true)
    expect(isHumanReviewCapability('chat.sendTaskRef')).toBe(false)
  })

  it('detects pending_confirm payloads', () => {
    expect(
      isCapabilityPendingConfirm({
        status: 'pending_confirm',
        pendingId: 'pend_1',
        capability: 'task.patch',
        pluginId: 'lanpm.example'
      })
    ).toBe(true)
    expect(isCapabilityPendingConfirm({ status: 'ok' })).toBe(false)
  })
})

describe('taskCreateWhitelist', () => {
  it('defines create whitelist', () => {
    expect(TASK_CREATE_WHITELIST_FIELDS).toEqual([
      'groupId',
      'title',
      'status',
      'priority',
      'tags'
    ])
  })

  it('rejects disallowed fields and invalid enums', () => {
    expect(getDisallowedTaskCreateFields({ groupId: 'g', title: 't', assigneeUserId: 'u' })).toEqual([
      'assigneeUserId'
    ])
    expect(parseTaskCreateInput({ groupId: 'g', title: 'Hi', status: 'todo' }).ok).toBe(true)
    expect(parseTaskCreateInput({ groupId: 'g', title: 'Hi', status: 'blocked' }).ok).toBe(false)
    expect(parseTaskCreateInput({ groupId: 'g' }).ok).toBe(false)
  })
})
