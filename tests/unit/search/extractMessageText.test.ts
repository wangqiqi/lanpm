import { describe, expect, it } from 'vitest'
import { extractMessageText } from '@shared/search/extractMessageText'
import type { MessageContent } from '@shared/chat/types'

describe('extractMessageText', () => {
  const cases: [MessageContent, string][] = [
    [{ kind: 'text', text: 'hello' }, 'hello'],
    [{ kind: 'code', language: 'ts', code: 'const x = 1' }, 'const x = 1'],
    [{ kind: 'task_ref', taskId: 't1', title: 'Fix bug' }, 'Fix bug'],
    [{ kind: 'file', fileId: 'f1', fileName: 'spec.pdf', size: 1024 }, 'spec.pdf'],
    [
      { kind: 'voice', fileId: 'v1', durationMs: 2500, mimeType: 'audio/webm' },
      '[voice 3s]'
    ],
    [{ kind: 'system', event: 'member_joined' }, 'member_joined'],
    [{ kind: 'recalled', recalledBy: 'u1', recalledAt: '2026-01-01' }, '']
  ]

  it.each(cases)('extracts from %o', (content, expected) => {
    expect(extractMessageText(content)).toBe(expected)
  })

  it('returns empty string for unknown content kind', () => {
    const unknown = { kind: 'unknown' } as unknown as MessageContent
    expect(extractMessageText(unknown)).toBe('')
  })
})
