import { describe, expect, it } from 'vitest'
import { gatewayTokenMatches, readBearerToken } from '../../../src/main/gateway/authToken.ts'

describe('gateway auth token', () => {
  it('matches bearer tokens with timing-safe compare', () => {
    expect(gatewayTokenMatches('secret', 'secret')).toBe(true)
    expect(gatewayTokenMatches('secret', 'secrex')).toBe(false)
    expect(gatewayTokenMatches('ab', 'abcd')).toBe(false)
  })

  it('parses Authorization Bearer and ignores query tokens', () => {
    expect(readBearerToken({ authorization: 'Bearer abc' })).toBe('abc')
    expect(readBearerToken({})).toBe(null)
  })
})
