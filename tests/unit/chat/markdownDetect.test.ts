import { describe, expect, it } from 'vitest'
import { looksLikeMarkdown, shouldRenderChatMarkdown } from '@shared/chat/markdownDetect'

describe('markdownDetect', () => {
  it('detects bold and lists', () => {
    expect(looksLikeMarkdown('plain hello')).toBe(false)
    expect(looksLikeMarkdown('**bold** text')).toBe(true)
    expect(looksLikeMarkdown('1. first item')).toBe(true)
  })

  it('always renders ai-assistant forwarded messages as markdown', () => {
    expect(shouldRenderChatMarkdown('plain', { source: 'ai-assistant' })).toBe(true)
  })
})
