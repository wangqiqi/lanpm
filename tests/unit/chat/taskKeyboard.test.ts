import { describe, expect, it } from 'vitest'
import { activeComposerSuggest } from '@shared/chat/taskRefs'

describe('activeComposerSuggest', () => {
  it('prefers the trigger closest to the end', () => {
    expect(activeComposerSuggest('hi @ali', true)).toBe('mention')
    expect(activeComposerSuggest('hi #fix', true)).toBe('task')
    expect(activeComposerSuggest('@ali #fix', true)).toBe('task')
    expect(activeComposerSuggest('#fix @ali', true)).toBe('mention')
  })

  it('returns null when task suggest disabled', () => {
    expect(activeComposerSuggest('#fix', false)).toBeNull()
  })
})
