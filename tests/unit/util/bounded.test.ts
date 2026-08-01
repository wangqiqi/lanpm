import { describe, expect, it } from 'vitest'
import { BoundedSet, LruMap } from '../../../src/shared/util/bounded'

describe('BoundedSet', () => {
  it('evicts oldest when over max', () => {
    const set = new BoundedSet<string>(2)
    set.add('a')
    set.add('b')
    set.add('c')
    expect(set.has('a')).toBe(false)
    expect(set.has('b')).toBe(true)
    expect(set.has('c')).toBe(true)
  })

  it('ignores duplicate adds without growing queue', () => {
    const set = new BoundedSet<string>(3)
    set.add('a')
    set.add('a')
    set.add('b')
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(true)
  })
})

describe('LruMap', () => {
  it('evicts least recently used entry', () => {
    const map = new LruMap<string, number>(2)
    map.set('a', 1)
    map.set('b', 2)
    map.get('a')
    map.set('c', 3)
    expect(map.get('b')).toBeUndefined()
    expect(map.get('a')).toBe(1)
    expect(map.get('c')).toBe(3)
  })

  it('updates existing key without growing size', () => {
    const map = new LruMap<string, number>(2)
    map.set('a', 1)
    map.set('a', 2)
    map.set('b', 3)
    expect(map.get('a')).toBe(2)
    expect(map.get('b')).toBe(3)
  })
})
