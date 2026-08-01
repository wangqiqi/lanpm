import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import {
  buildMessageContextMenuActions,
  canAnalyzeInAssistant,
  getMessageCopyCodeText,
  getMessageCopyPayload
} from '@shared/chat/messageContextMenu'

const base = (content: ChatMessage['content']): ChatMessage => ({
  msgId: 'msg_1',
  groupId: 'g1',
  senderUserId: 'user_a',
  senderDeviceId: 'dev_a',
  type: 'text',
  content,
  lamportTs: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  deliveryStatus: 'sent'
})

describe('messageContextMenu', () => {
  it('getMessageCopyPayload for text/code/file/task_ref', () => {
    expect(getMessageCopyPayload(base({ kind: 'text', text: 'hello' }))).toEqual({
      kind: 'text',
      text: 'hello'
    })
    expect(getMessageCopyPayload(base({ kind: 'code', language: 'js', code: 'x=1' }))).toEqual({
      kind: 'code',
      text: 'x=1'
    })
    expect(
      getMessageCopyPayload(
        base({ kind: 'file', fileId: 'f1', fileName: 'a.pdf', size: 100 })
      )
    ).toEqual({ kind: 'fileMeta', text: 'a.pdf' })
    expect(
      getMessageCopyPayload(base({ kind: 'task_ref', taskId: 't1', title: 'Fix bug' }))
    ).toEqual({ kind: 'taskRef', text: 'Fix bug' })
    expect(getMessageCopyPayload(base({ kind: 'recalled', recalledBy: 'u', recalledAt: 't' }))).toBeNull()
  })

  it('getMessageCopyCodeText only for code', () => {
    expect(getMessageCopyCodeText(base({ kind: 'code', language: 'js', code: 'a' }))).toBe('a')
    expect(getMessageCopyCodeText(base({ kind: 'text', text: 'a' }))).toBeNull()
  })

  it('orders v2 actions with recall at bottom for own text', () => {
    const message = base({ kind: 'text', text: 'work item' })
    const ids = buildMessageContextMenuActions({
      message,
      own: true,
      currentUserId: 'user_a',
      taskCreateAllowed: true
    }).map((a) => a.id)
    expect(ids[0]).toBe('copy')
    expect(ids).toContain('reply')
    expect(ids).toContain('forward')
    expect(ids.at(-1)).toBe('recall')
  })

  it('code message has copy and copyCode plus quote/forward', () => {
    const message = base({ kind: 'code', language: 'ts', code: 'const x = 1' })
    const ids = buildMessageContextMenuActions({
      message,
      own: false,
      taskCreateAllowed: true
    }).map((a) => a.id)
    expect(ids).toEqual([
      'copy',
      'copyCode',
      'reply',
      'forward',
      'createTask',
      'linkExistingTask',
      'enterMultiSelect'
    ])
  })

  it('task_ref opens task without create/link', () => {
    const message = base({ kind: 'task_ref', taskId: 't1', title: 'T' })
    const ids = buildMessageContextMenuActions({
      message,
      own: false,
      taskCreateAllowed: true
    }).map((a) => a.id)
    expect(ids).toEqual([
      'copy',
      'openTask',
      'reply',
      'forward',
      'enterMultiSelect'
    ])
  })

  it('file message copy + open file only (no link file menu)', () => {
    const message = base({ kind: 'file', fileId: 'f1', fileName: 'x', size: 1 })
    const ids = buildMessageContextMenuActions({
      message,
      own: true,
      currentUserId: 'user_a',
      taskCreateAllowed: true
    }).map((a) => a.id)
    expect(ids).toContain('openFile')
    expect(ids).not.toContain('linkFile')
    expect(ids).not.toContain('hide')
    expect(ids.at(-1)).toBe('recall')
  })

  it('log file adds analyzeInAssistant', () => {
    const message = base({ kind: 'file', fileId: 'f1', fileName: 'app.log', size: 1 })
    expect(canAnalyzeInAssistant(message)).toBe(true)
    const ids = buildMessageContextMenuActions({
      message,
      own: false,
      taskCreateAllowed: false
    }).map((a) => a.id)
    expect(ids).toContain('analyzeInAssistant')
  })

  it('ops-agent text adds analyzeInAssistant', () => {
    const message = base({
      kind: 'text',
      text: 'host: prod\nmem: 50%',
      meta: { source: 'ops-agent' }
    })
    expect(canAnalyzeInAssistant(message)).toBe(true)
  })
})
