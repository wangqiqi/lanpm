import { describe, expect, it } from 'vitest'
import {
  getDisallowedChatSendMarkdownFields,
  parseChatSendMarkdownInput,
  CHAT_SEND_MARKDOWN_MAX_LENGTH
} from '../../../src/shared/plugin/chatSendMarkdownWhitelist.ts'
import {
  getDisallowedAiGetThreadFields,
  parseAiGetThreadInput
} from '../../../src/shared/plugin/aiGetThreadWhitelist.ts'
import {
  getDisallowedAiStreamChatFields,
  parseAiStreamChatCapabilityInput,
  AI_STREAM_CHAT_MAX_MESSAGE_LENGTH
} from '../../../src/shared/plugin/aiStreamChatWhitelist.ts'

describe('extension-api-v0.6 whitelists', () => {
  it('chat.sendMarkdown parses and rejects extras', () => {
    expect(getDisallowedChatSendMarkdownFields({ groupId: 'g', markdown: '# hi', extra: 1 })).toEqual([
      'extra'
    ])
    expect(parseChatSendMarkdownInput({ groupId: 'g1', markdown: '**bold**' }).ok).toBe(true)
    expect(parseChatSendMarkdownInput({ groupId: 'g1', markdown: '' }).ok).toBe(false)
    expect(
      parseChatSendMarkdownInput({
        groupId: 'g1',
        markdown: 'x'.repeat(CHAT_SEND_MARKDOWN_MAX_LENGTH + 1)
      }).ok
    ).toBe(false)
  })

  it('ai.getThread requires threadId', () => {
    expect(getDisallowedAiGetThreadFields({ threadId: 't1', extra: true })).toEqual(['extra'])
    expect(parseAiGetThreadInput({ threadId: 'aith_1' }).ok).toBe(true)
    expect(parseAiGetThreadInput({}).ok).toBe(false)
  })

  it('ai.streamChat parses plugin subset', () => {
    expect(getDisallowedAiStreamChatFields({ userMessage: 'hi', model: 'x' })).toEqual(['model'])
    expect(parseAiStreamChatCapabilityInput({ userMessage: 'hello' }).ok).toBe(true)
    expect(parseAiStreamChatCapabilityInput({ userMessage: '' }).ok).toBe(false)
    expect(
      parseAiStreamChatCapabilityInput({
        userMessage: 'x'.repeat(AI_STREAM_CHAT_MAX_MESSAGE_LENGTH + 1)
      }).ok
    ).toBe(false)
    const ok = parseAiStreamChatCapabilityInput({
      userMessage: 'hi',
      threadId: 'aith_1',
      groupId: 'g1',
      taskIds: ['t1'],
      createThreadTitle: 'New'
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.value.taskIds).toEqual(['t1'])
    }
  })
})
