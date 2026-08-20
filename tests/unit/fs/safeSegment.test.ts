import { describe, expect, it } from 'vitest'
import {
  assertSafeFileName,
  assertSafePathSegment,
  isSafePathSegment,
  rejectRendererUploadPath
} from '../../../src/shared/fs/safeSegment.ts'

describe('safeSegment', () => {
  it('allows demo and grp ids', () => {
    expect(isSafePathSegment('demo-project')).toBe(true)
    expect(isSafePathSegment('grp_abc-def')).toBe(true)
  })

  it('rejects traversal group ids', () => {
    expect(isSafePathSegment('../etc')).toBe(false)
    expect(isSafePathSegment('..')).toBe(false)
    expect(isSafePathSegment('a/../b')).toBe(false)
    expect(() => assertSafePathSegment('../../secret', 'groupId')).toThrow(/groupId/)
  })

  it('rejects unsafe file names', () => {
    expect(() => assertSafeFileName('..')).toThrow()
    expect(() => assertSafeFileName('a/../b.txt')).toThrow()
    expect(() => assertSafeFileName('ok.txt')).not.toThrow()
  })

  it('rejects renderer upload paths', () => {
    expect(() => rejectRendererUploadPath('/etc/passwd')).toThrow(/filePath/)
    expect(() => rejectRendererUploadPath(undefined)).not.toThrow()
    expect(() => rejectRendererUploadPath('')).not.toThrow()
  })
})
