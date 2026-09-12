import { describe, expect, it } from 'vitest'
import { parseDiscoverSeedsEnv } from '@shared/discover/discoverSeedsEnv'

describe('parseDiscoverSeedsEnv', () => {
  it('parses comma and whitespace lists', () => {
    expect(parseDiscoverSeedsEnv('192.168.20.16:43124')).toEqual(['192.168.20.16:43124'])
    expect(parseDiscoverSeedsEnv('10.0.0.1:43124, 10.0.0.2:43124')).toEqual([
      '10.0.0.1:43124',
      '10.0.0.2:43124'
    ])
    expect(parseDiscoverSeedsEnv('10.0.0.1:43124;10.0.0.2:43124')).toEqual([
      '10.0.0.1:43124',
      '10.0.0.2:43124'
    ])
  })

  it('ignores empty and invalid', () => {
    expect(parseDiscoverSeedsEnv(undefined)).toEqual([])
    expect(parseDiscoverSeedsEnv('  ')).toEqual([])
    expect(parseDiscoverSeedsEnv('not-a-host')).toEqual([])
  })
})
