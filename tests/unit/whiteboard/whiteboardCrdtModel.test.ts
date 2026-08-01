import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  applyWhiteboardEncodedUpdate,
  createEmptyWhiteboardDoc,
  emptyOrScene,
  encodeWhiteboardDocState,
  encodeWhiteboardDocStateAsUpdate,
  encodeWhiteboardDocStateVector,
  pruneOversizedWhiteboardAssets,
  seedWhiteboardDocFromSceneJson,
  WHITEBOARD_CRDT_ASSETS_KEY,
  WHITEBOARD_CRDT_ELEMENTS_KEY,
  WHITEBOARD_MAX_ASSET_CHARS,
  whiteboardDocToSceneJson,
  yjsElementsToExcalidraw
} from '../../../src/shared/whiteboard/whiteboardCrdtModel'

const sampleElement = {
  id: 'el1',
  type: 'rectangle',
  version: 1,
  x: 0,
  y: 0
}

function sceneJsonWith(
  elements: unknown[] = [sampleElement],
  files: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    elements,
    files,
    appState: {}
  })
}

describe('whiteboardCrdtModel', () => {
  it('creates empty doc and round-trips encoded state', () => {
    const doc = createEmptyWhiteboardDoc()
    expect(doc.getArray(WHITEBOARD_CRDT_ELEMENTS_KEY).length).toBe(0)
    expect(doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY).size).toBe(0)

    const remote = createEmptyWhiteboardDoc()
    const update = encodeWhiteboardDocState(doc)
    applyWhiteboardEncodedUpdate(remote, update, 'test')
    expect(encodeWhiteboardDocState(remote).byteLength).toBeGreaterThan(0)

    const sv = encodeWhiteboardDocStateVector(doc)
    const delta = encodeWhiteboardDocStateAsUpdate(doc, sv)
    expect(delta).toBeInstanceOf(Uint8Array)
    expect(encodeWhiteboardDocStateAsUpdate(doc, new Uint8Array()).byteLength).toBeGreaterThan(0)
  })

  it('seeds elements and assets from sceneJson', () => {
    const doc = createEmptyWhiteboardDoc()
    const hugeDataUrl = 'x'.repeat(WHITEBOARD_MAX_ASSET_CHARS + 1)
    seedWhiteboardDocFromSceneJson(
      doc,
      sceneJsonWith([sampleElement, null, 'bad'], {
        ok: { dataURL: 'data:image/png;base64,AA==' },
        huge: { dataURL: hugeDataUrl },
        bad: null
      })
    )

    expect(doc.getArray(WHITEBOARD_CRDT_ELEMENTS_KEY).length).toBe(1)
    expect(doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY).has('ok')).toBe(true)
    expect(doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY).has('huge')).toBe(false)

    const sceneOut = whiteboardDocToSceneJson(doc)
    const parsed = JSON.parse(sceneOut) as { elements: unknown[]; files: Record<string, unknown> }
    expect(parsed.elements).toHaveLength(1)
    expect(parsed.files.ok).toBeTruthy()
    expect(parsed.files.huge).toBeUndefined()
  })

  it('does not re-seed when elements already exist', () => {
    const doc = createEmptyWhiteboardDoc()
    seedWhiteboardDocFromSceneJson(doc, sceneJsonWith([sampleElement]))
    seedWhiteboardDocFromSceneJson(
      doc,
      sceneJsonWith([{ ...sampleElement, id: 'el2', version: 2 }])
    )
    expect(doc.getArray(WHITEBOARD_CRDT_ELEMENTS_KEY).length).toBe(1)
  })

  it('prunes oversized assets', () => {
    const doc = createEmptyWhiteboardDoc()
    const yAssets = doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
    yAssets.set('small', { dataURL: 'data:image/png;base64,AA==' })
    yAssets.set('big', { dataURL: 'x'.repeat(WHITEBOARD_MAX_ASSET_CHARS + 10) })
    yAssets.set('bad', null)

    expect(pruneOversizedWhiteboardAssets(doc)).toBe(1)
    expect(yAssets.has('big')).toBe(false)
    expect(yAssets.has('small')).toBe(true)
  })

  it('sorts yjs elements and filters invalid excalidraw shapes', () => {
    const doc = createEmptyWhiteboardDoc()
    const yArray = doc.getArray<Y.Map<unknown>>(WHITEBOARD_CRDT_ELEMENTS_KEY)
    const make = (pos: string, el: unknown) => {
      const m = new Y.Map<unknown>()
      m.set('pos', pos)
      m.set('el', el)
      return m
    }
    doc.transact(() => {
      yArray.push([
        make('a0002', { id: 'b', type: 'ellipse', version: 1 }),
        make('a0001', { id: 'a', type: 'rectangle', version: 1 }),
        make('a0003', { id: 'bad', type: 'rectangle' })
      ])
    })

    const elements = yjsElementsToExcalidraw(yArray)
    expect(elements.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('handles invalid scene json and emptyOrScene', () => {
    const doc = createEmptyWhiteboardDoc()
    seedWhiteboardDocFromSceneJson(doc, 'not json')
    expect(doc.getArray(WHITEBOARD_CRDT_ELEMENTS_KEY).length).toBe(0)

    const empty = emptyOrScene(null)
    expect(empty).toContain('excalidraw')
    expect(emptyOrScene(sceneJsonWith())).toContain('el1')
  })
})
