import { describe, expect, it } from 'vitest'
import { parseHostPort } from '@shared/network/manualPeer'

describe('parseHostPort', () => {
  it('parses host:port', () => {
    expect(parseHostPort('192.168.1.10:43124')).toEqual({
      host: '192.168.1.10',
      port: 43124
    })
  })

  it('trims whitespace', () => {
    expect(parseHostPort('  localhost:8080  ')).toEqual({ host: 'localhost', port: 8080 })
  })

  it('rejects invalid format', () => {
    expect(() => parseHostPort('no-port')).toThrow('INVALID_HOST_PORT')
    expect(() => parseHostPort('host:99999')).toThrow('INVALID_PORT')
  })
})
