import { describe, expect, it, afterEach } from 'vitest'
import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate
} from 'y-protocols/awareness'
import {
  isTaskAwarenessLocalState,
  taskAwarenessPayloadFromUpdate,
  decodeTaskAwarenessUpdate,
  isTaskAwarenessPayload
} from '../../../src/shared/task/taskAwareness'

describe('taskAwareness encode/apply (TASK-178)', () => {
  const docs: Y.Doc[] = []

  afterEach(() => {
    for (const d of docs) d.destroy()
    docs.length = 0
  })

  it('round-trips focus Presence via awareness update bytes', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    docs.push(docA, docB)
    const a = new Awareness(docA)
    const b = new Awareness(docB)

    const local = {
      userId: 'u-a',
      displayName: 'Alice',
      focusedTaskId: 'task-1',
      view: 'board' as const
    }
    expect(isTaskAwarenessLocalState(local)).toBe(true)
    a.setLocalState(local)

    const update = encodeAwarenessUpdate(a, [a.clientID])
    const payload = taskAwarenessPayloadFromUpdate('g1', update)
    expect(isTaskAwarenessPayload(payload)).toBe(true)

    applyAwarenessUpdate(b, decodeTaskAwarenessUpdate(payload), 'remote')
    const remote = [...b.getStates().values()].find(
      (s) => isTaskAwarenessLocalState(s) && s.userId === 'u-a'
    )
    expect(remote).toMatchObject(local)
  })

  it('clears remote state when local sets null', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    docs.push(docA, docB)
    const a = new Awareness(docA)
    const b = new Awareness(docB)

    a.setLocalState({
      userId: 'u-a',
      displayName: 'Alice',
      focusedTaskId: 't1',
      view: 'tree'
    })
    applyAwarenessUpdate(b, encodeAwarenessUpdate(a, [a.clientID]), 'remote')
    expect([...b.getStates().values()].some((s) => s?.userId === 'u-a')).toBe(true)

    a.setLocalState(null)
    applyAwarenessUpdate(b, encodeAwarenessUpdate(a, [a.clientID]), 'remote')
    expect([...b.getStates().values()].some((s) => s?.userId === 'u-a')).toBe(false)
  })
})
