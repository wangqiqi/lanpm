import { describe, expect, it } from 'vitest'
import { isTaskCommandDraft, parseTaskCommand } from '@shared/chat/taskCommand'

describe('parseTaskCommand', () => {
  it('parses title after /task', () => {
    expect(parseTaskCommand('/task Fix login UI')).toEqual({ title: 'Fix login UI' })
  })

  it('allows bare /task', () => {
    expect(parseTaskCommand('/task')).toEqual({ title: '' })
  })

  it('rejects non-task text', () => {
    expect(parseTaskCommand('hello')).toBeNull()
  })
})

describe('isTaskCommandDraft', () => {
  it('detects leading /task', () => {
    expect(isTaskCommandDraft('  /task draft')).toBe(true)
    expect(isTaskCommandDraft('/hello')).toBe(false)
  })
})
