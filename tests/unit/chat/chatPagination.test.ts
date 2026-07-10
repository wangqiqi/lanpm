import { describe, expect, it } from 'vitest'
import { CHAT_HISTORY_PAGE_SIZE } from '../../../src/shared/chat/pagination.ts'

describe('chat history pagination constants', () => {
  it('uses a 200-message page size', () => {
    expect(CHAT_HISTORY_PAGE_SIZE).toBe(200)
  })
})
