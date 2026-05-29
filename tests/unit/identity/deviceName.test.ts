import { describe, expect, it } from 'vitest'
import { resolveDeviceName } from '@shared/identity/deviceName'

describe('resolveDeviceName', () => {
  it('trims and uses fallback when empty', () => {
    expect(resolveDeviceName('  My-PC  ')).toBe('My-PC')
    expect(resolveDeviceName('', '备用')).toBe('备用')
    expect(resolveDeviceName(null)).toBe('本机')
  })

  it('truncates to 30 characters', () => {
    const long = 'a'.repeat(40)
    expect(resolveDeviceName(long)).toHaveLength(30)
    expect(resolveDeviceName(long)).toBe('a'.repeat(30))
  })
})
