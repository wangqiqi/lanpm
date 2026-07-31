import { afterEach, describe, expect, it } from 'vitest'
import {
  DUE_NOTIFIED_KEYS,
  NOTIFY_ALL_MESSAGES_KEY,
  NOTIFY_DUE_TASKS_KEY,
  getDueNotifiedKeys,
  getNotifyAllMessages,
  getNotifyDueTasks,
  markDueNotified,
  setNotifyAllMessages,
  setNotifyDueTasks
} from '@shared/chat/notificationPreferences'

const memory = new Map<string, string>()

const localStorageMock = {
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
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true
})

afterEach(() => {
  memory.clear()
})

describe('notificationPreferences', () => {
  it('defaults notify-all off and due-tasks on', () => {
    expect(getNotifyAllMessages()).toBe(false)
    expect(getNotifyDueTasks()).toBe(true)
  })

  it('persists notify toggles', () => {
    setNotifyAllMessages(true)
    expect(getNotifyAllMessages()).toBe(true)
    expect(memory.get(NOTIFY_ALL_MESSAGES_KEY)).toBe('true')
    setNotifyAllMessages(false)
    expect(getNotifyAllMessages()).toBe(false)

    setNotifyDueTasks(false)
    expect(getNotifyDueTasks()).toBe(false)
    expect(memory.get(NOTIFY_DUE_TASKS_KEY)).toBe('false')
    setNotifyDueTasks(true)
    expect(getNotifyDueTasks()).toBe(true)
  })

  it('tracks due notified keys and trims to 200', () => {
    expect(getDueNotifiedKeys().size).toBe(0)
    markDueNotified(['a:1', 'b:1'])
    expect([...getDueNotifiedKeys()].sort()).toEqual(['a:1', 'b:1'])
    expect(memory.get(DUE_NOTIFIED_KEYS)).toContain('a:1')

    const many = Array.from({ length: 205 }, (_, i) => `k:${i}`)
    markDueNotified(many)
    expect(getDueNotifiedKeys().size).toBe(200)
  })

  it('tolerates corrupt due-notified JSON', () => {
    memory.set(DUE_NOTIFIED_KEYS, '{not-json')
    expect(getDueNotifiedKeys().size).toBe(0)
    memory.set(DUE_NOTIFIED_KEYS, JSON.stringify({ nope: true }))
    expect(getDueNotifiedKeys().size).toBe(0)
  })
})
