import { describe, expect, it } from 'vitest'
import {
  deterministicAvatarDataUrl,
  normalizeAvatarDataUrl,
  resolveAvatarSrc
} from '@shared/identity/avatar'

describe('normalizeAvatarDataUrl', () => {
  it('rewrites legacy ;utf8, to charset=utf-8', () => {
    const legacy = 'data:image/svg+xml;utf8,%3Csvg%2F%3E'
    expect(normalizeAvatarDataUrl(legacy)).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')
  })

  it('passes through modern urls', () => {
    const ok = 'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E'
    expect(normalizeAvatarDataUrl(ok)).toBe(ok)
  })

  it('returns undefined for empty', () => {
    expect(normalizeAvatarDataUrl(undefined)).toBeUndefined()
    expect(normalizeAvatarDataUrl(null)).toBeUndefined()
    expect(normalizeAvatarDataUrl('')).toBeUndefined()
  })
})

describe('resolveAvatarSrc', () => {
  it('prefers normalized stored url', () => {
    const legacy = 'data:image/svg+xml;utf8,%3Csvg%2F%3E'
    expect(resolveAvatarSrc(legacy, 'Alice', 'u1')).toContain('charset=utf-8')
  })

  it('falls back to deterministic color block', () => {
    const a = resolveAvatarSrc(undefined, 'Alice', 'user-a')
    const b = resolveAvatarSrc(undefined, 'Alice', 'user-a')
    const c = resolveAvatarSrc(undefined, 'Bob', 'user-b')
    expect(a).toBe(b)
    expect(a).toContain('data:image/svg+xml;charset=utf-8,')
    expect(a).not.toBe(c)
  })

  it('deterministicAvatarDataUrl is stable', () => {
    expect(deterministicAvatarDataUrl('X', 'seed')).toBe(deterministicAvatarDataUrl('X', 'seed'))
  })
})
