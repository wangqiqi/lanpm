import { describe, expect, it } from 'vitest'
import {
  buildWhiteboardScene,
  emptyWhiteboardSceneJson,
  isNonEmptySceneJson,
  normalizeSceneJson
} from '@shared/whiteboard/types'

describe('whiteboard scene contract', () => {
  it('emptyWhiteboardSceneJson is valid JSON object', () => {
    const raw = emptyWhiteboardSceneJson()
    const parsed = JSON.parse(raw) as { elements: unknown[]; type: string }
    expect(parsed.type).toBe('excalidraw')
    expect(Array.isArray(parsed.elements)).toBe(true)
    expect(parsed.elements).toHaveLength(0)
  })

  it('normalizeSceneJson rejects non-objects', () => {
    expect(() => normalizeSceneJson('[]')).toThrow(/object/)
    expect(() => normalizeSceneJson('null')).toThrow(/object/)
    expect(() => normalizeSceneJson('not-json')).toThrow()
  })

  it('normalizeSceneJson accepts empty string as empty scene', () => {
    const out = normalizeSceneJson('  ')
    expect(JSON.parse(out)).toMatchObject({ type: 'excalidraw', elements: [] })
  })

  it('buildWhiteboardScene omits empty linkedTaskId', () => {
    const scene = buildWhiteboardScene('g1', emptyWhiteboardSceneJson(), undefined, '2026-07-11T00:00:00.000Z')
    expect(scene.groupId).toBe('g1')
    expect(scene.linkedTaskId).toBeUndefined()
    expect(isNonEmptySceneJson(scene.sceneJson)).toBe(true)
  })

  it('buildWhiteboardScene keeps linkedTaskId', () => {
    const scene = buildWhiteboardScene(
      'g1',
      '{"elements":[]}',
      'task-1',
      '2026-07-11T00:00:00.000Z'
    )
    expect(scene.linkedTaskId).toBe('task-1')
  })
})
