import { describe, expect, it } from 'vitest'
import {
  addDiscoverSeed,
  normalizeDiscoverSeeds,
  removeDiscoverSeed
} from '@shared/discover/discoverSeeds'

describe('normalizeDiscoverSeeds', () => {
  it('parses json string and dedupes', () => {
    expect(
      normalizeDiscoverSeeds([' 10.0.0.1:43124 ', '10.0.0.1:43124', 'bad', '10.0.0.2:43124'])
    ).toEqual(['10.0.0.1:43124', '10.0.0.2:43124'])
    expect(normalizeDiscoverSeeds('["192.168.1.5:43124"]')).toEqual(['192.168.1.5:43124'])
  })

  it('add/remove helpers', () => {
    expect(addDiscoverSeed([], '10.0.0.1:43124')).toEqual(['10.0.0.1:43124'])
    expect(removeDiscoverSeed(['10.0.0.1:43124', '10.0.0.2:43124'], '10.0.0.1:43124')).toEqual([
      '10.0.0.2:43124'
    ])
  })
})
