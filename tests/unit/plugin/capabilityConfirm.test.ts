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
import {
  parseChatSendTextInput,
  CHAT_SEND_TEXT_WHITELIST_FIELDS
} from '../../../src/shared/plugin/chatSendTextWhitelist.ts'
import {
  parseFileUploadInput,
  FILE_UPLOAD_WHITELIST_FIELDS
} from '../../../src/shared/plugin/fileUploadWhitelist.ts'

describe('capabilityConfirm', () => {
  it('marks create/patch/move as human-review', () => {
    expect([...HUMAN_REVIEW_CAPABILITY_IDS]).toEqual([
      'task.create',
      'task.patch',
      'board.moveTask',
      'chat.sendText',
      'chat.sendMarkdown',
      'ai.streamChat',
      'file.upload'
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

describe('chatSendTextWhitelist', () => {
  it('defines sendText whitelist', () => {
    expect(CHAT_SEND_TEXT_WHITELIST_FIELDS).toEqual(['groupId', 'text', 'replyToMsgId'])
  })

  it('parses valid sendText input', () => {
    expect(parseChatSendTextInput({ groupId: 'g', text: 'Hi' }).ok).toBe(true)
    expect(parseChatSendTextInput({ groupId: 'g', text: 'Hi', replyToMsgId: 'm1' }).ok).toBe(true)
    expect(parseChatSendTextInput({ groupId: 'g', text: '' }).ok).toBe(false)
  })
})

describe('fileUploadWhitelist', () => {
  it('defines upload whitelist', () => {
    expect(FILE_UPLOAD_WHITELIST_FIELDS).toEqual(['groupId'])
  })

  it('parses valid upload input', () => {
    expect(parseFileUploadInput({ groupId: 'g' }).ok).toBe(true)
    expect(parseFileUploadInput({ groupId: 'g', sourcePath: '/tmp/a.txt' }).ok).toBe(false)
    expect(parseFileUploadInput({})).toMatchObject({ ok: false })
  })
})
