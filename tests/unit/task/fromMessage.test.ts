import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@shared/chat/types'
import { linkedFileIdsFromMessage, titleFromChatMessage } from '@shared/task/fromMessage'
import { TASK_TITLE_MAX_LENGTH } from '@shared/task/validation'

function base(partial: Partial<ChatMessage> & Pick<ChatMessage, 'content'>): ChatMessage {
  return {
    msgId: 'm1',
    groupId: 'g1',
    senderUserId: 'u1',
    senderDeviceId: 'd1',
    type: 'text',
    lamportTs: 1,
    createdAt: '2026-07-11T00:00:00Z',
    deliveryStatus: 'sent',
    ...partial
  }
}

describe('titleFromChatMessage', () => {
  it('uses text / code first line / fileName', () => {
    expect(
      titleFromChatMessage(base({ content: { kind: 'text', text: '  hello world  ' } }))
    ).toBe('hello world')
    expect(
      titleFromChatMessage(
        base({ content: { kind: 'code', language: 'ts', code: 'const a = 1\nconst b = 2' } })
      )
    ).toBe('const a = 1')
    expect(
      titleFromChatMessage(
        base({
          content: { kind: 'file', fileId: 'f1', fileName: 'spec.pdf', size: 10 }
        })
      )
    ).toBe('spec.pdf')
  })

  it('rejects task_ref / system / recalled / empty', () => {
    expect(
      titleFromChatMessage(
        base({ content: { kind: 'task_ref', taskId: 't1', title: 'T' } })
      )
    ).toBeNull()
    expect(titleFromChatMessage(base({ content: { kind: 'text', text: '   ' } }))).toBeNull()
  })

  it('truncates to TASK_TITLE_MAX_LENGTH', () => {
    const long = 'x'.repeat(TASK_TITLE_MAX_LENGTH + 20)
    expect(titleFromChatMessage(base({ content: { kind: 'text', text: long } }))!.length).toBe(
      TASK_TITLE_MAX_LENGTH
    )
  })
})

describe('linkedFileIdsFromMessage', () => {
  it('returns file id only for file messages', () => {
    expect(
      linkedFileIdsFromMessage(
        base({ content: { kind: 'file', fileId: 'f1', fileName: 'a', size: 1 } })
      )
    ).toEqual(['f1'])
    expect(linkedFileIdsFromMessage(base({ content: { kind: 'text', text: 'x' } }))).toBeUndefined()
  })
})
