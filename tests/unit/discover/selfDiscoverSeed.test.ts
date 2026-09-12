import { describe, expect, it } from 'vitest'
import {
  isSelfDiscoverSeed,
  normalizeDiscoverHost,
  pruneSelfDiscoverSeeds
} from '@shared/discover/selfDiscoverSeed'

describe('selfDiscoverSeed', () => {
  it('normalizes IPv4-mapped hosts', () => {
    expect(normalizeDiscoverHost('::ffff:192.168.20.16')).toBe('192.168.20.16')
  })

  it('treats this machine IP + listen port as self', () => {
    expect(isSelfDiscoverSeed('192.168.20.16:43124', ['192.168.20.16'], 43124)).toBe(true)
    expect(isSelfDiscoverSeed('127.0.0.1:43124', ['192.168.20.16'], 43124)).toBe(true)
    expect(isSelfDiscoverSeed('192.168.20.12:43124', ['192.168.20.16'], 43124)).toBe(false)
    expect(isSelfDiscoverSeed('192.168.20.16:9999', ['192.168.20.16'], 43124)).toBe(false)
  })

  it('prunes self addresses from seed lists', () => {
    expect(
      pruneSelfDiscoverSeeds(
        ['192.168.20.12:43124', '192.168.20.16:43124', '192.168.30.170:43124'],
        ['192.168.20.16'],
        43124
      )
    ).toEqual(['192.168.20.12:43124', '192.168.30.170:43124'])
  })
})
