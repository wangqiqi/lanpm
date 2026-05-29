import { describe, expect, it } from 'vitest'
import { detectLanguage, normalizeLanguage, toHighlightLanguage } from '@shared/chat/detectLanguage'

describe('normalizeLanguage', () => {
  it('maps common aliases', () => {
    expect(normalizeLanguage('ts')).toBe('typescript')
    expect(normalizeLanguage('py')).toBe('python')
    expect(normalizeLanguage('sh')).toBe('bash')
  })
})

describe('detectLanguage', () => {
  it('respects explicit hint', () => {
    expect(detectLanguage('any code', 'python')).toBe('python')
  })

  it('detects json', () => {
    expect(detectLanguage('{"a": 1}')).toBe('json')
  })

  it('detects python heuristics', () => {
    expect(detectLanguage('def hello():\n  pass')).toBe('python')
  })

  it('falls back to plaintext', () => {
    expect(detectLanguage('plain notes')).toBe('plaintext')
  })
})

describe('toHighlightLanguage', () => {
  it('maps html to xml for highlight.js', () => {
    expect(toHighlightLanguage('html')).toBe('xml')
  })
})
