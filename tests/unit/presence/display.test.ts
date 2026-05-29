import { describe, expect, it } from 'vitest'
import { presenceEmoji, presenceLabel } from '@shared/presence/display'

describe('presenceEmoji', () => {
  it.each([
    ['online', '🟢'],
    ['away', '🟡'],
    ['offline', '⚪']
  ] as const)('%s → %s', (presence, emoji) => {
    expect(presenceEmoji(presence)).toBe(emoji)
  })
})

describe('presenceLabel', () => {
  it.each([
    ['online', '在线'],
    ['away', '离开'],
    ['offline', '离线']
  ] as const)('%s → %s', (presence, label) => {
    expect(presenceLabel(presence)).toBe(label)
  })
})
