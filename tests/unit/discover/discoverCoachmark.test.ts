import { afterEach, describe, expect, it } from 'vitest'
import {
  DISCOVER_COACHMARK_SEEN_KEY,
  isDiscoverCoachmarkSeen,
  markDiscoverCoachmarkSeen
} from '@shared/discover/discoverCoachmark'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string): string | null => memory.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      memory.set(key, value)
    },
    removeItem: (key: string): void => {
      memory.delete(key)
    },
    clear: (): void => {
      memory.clear()
    }
  },
  configurable: true
})

afterEach(() => {
  memory.clear()
})

describe('discoverCoachmark', () => {
  it('defaults to unseen and persists seen flag', () => {
    expect(isDiscoverCoachmarkSeen()).toBe(false)
    markDiscoverCoachmarkSeen()
    expect(isDiscoverCoachmarkSeen()).toBe(true)
    expect(memory.get(DISCOVER_COACHMARK_SEEN_KEY)).toBe('true')
  })
})
