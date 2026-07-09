import { describe, expect, it } from 'vitest'
import { isAllowedHttpUrl } from '../../../src/shared/security/httpUrl.ts'

describe('isAllowedHttpUrl', () => {
  it('allows http and https', () => {
    expect(isAllowedHttpUrl('https://example.com/path')).toBe(true)
    expect(isAllowedHttpUrl('http://192.168.1.1:8080/')).toBe(true)
  })

  it('rejects non-http schemes and junk', () => {
    expect(isAllowedHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedHttpUrl('data:text/html,hi')).toBe(false)
    expect(isAllowedHttpUrl('/relative')).toBe(false)
    expect(isAllowedHttpUrl('')).toBe(false)
    expect(isAllowedHttpUrl('not a url')).toBe(false)
  })
})
