/**
 * Y.Doc shape for `whiteboard:{groupId}` — elements Array + assets Map (y-excalidraw).
 * Pure helpers — no Electron; avoids importing Binding package in main.
 */
import * as Y from 'yjs'
import { LANPM_SURFACE_SOLID_HEX } from '../design/lanpmDesignTokens.ts'
import {
  emptyWhiteboardSceneJson,
  normalizeSceneJson
} from './types.ts'

export const WHITEBOARD_CRDT_ELEMENTS_KEY = 'elements'
export const WHITEBOARD_CRDT_ASSETS_KEY = 'assets'

/** Soft cap per binary asset (dataURL / bytes) to keep P2P envelopes bounded (TASK-262). */
export const WHITEBOARD_MAX_ASSET_CHARS = 512 * 1024

export function createEmptyWhiteboardDoc(): Y.Doc {
  const doc = new Y.Doc()
  doc.getArray(WHITEBOARD_CRDT_ELEMENTS_KEY)
  doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
  return doc
}

export function encodeWhiteboardDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

export function encodeWhiteboardDocStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc)
}

export function encodeWhiteboardDocStateAsUpdate(
  doc: Y.Doc,
  targetStateVector?: Uint8Array
): Uint8Array {
  if (!targetStateVector || targetStateVector.byteLength === 0) {
    return Y.encodeStateAsUpdate(doc)
  }
  return Y.encodeStateAsUpdate(doc, targetStateVector)
}

export function applyWhiteboardEncodedUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  origin: unknown = null
): void {
  Y.applyUpdate(doc, update, origin)
}

function posKey(index: number): string {
  return `a${index.toString(36).padStart(4, '0')}`
}

type SceneLike = {
  elements?: unknown[]
  files?: Record<string, unknown>
  appState?: Record<string, unknown>
}

function parseScene(sceneJson: string): SceneLike {
  try {
    const raw = JSON.parse(normalizeSceneJson(sceneJson)) as SceneLike
    return {
      elements: Array.isArray(raw.elements) ? raw.elements : [],
      files: raw.files && typeof raw.files === 'object' ? raw.files : {},
      appState: raw.appState && typeof raw.appState === 'object' ? raw.appState : {}
    }
  } catch {
    return { elements: [], files: {}, appState: {} }
  }
}

/** Seed y-excalidraw structures from persisted sceneJson (one-shot when no CRDT blob). */
export function seedWhiteboardDocFromSceneJson(
  doc: Y.Doc,
  sceneJson: string,
  origin: unknown = 'seed'
): void {
  const scene = parseScene(sceneJson)
  const elements = scene.elements ?? []
  const files = scene.files ?? {}

  doc.transact(() => {
    const yElements = doc.getArray<Y.Map<unknown>>(WHITEBOARD_CRDT_ELEMENTS_KEY)
    if (yElements.length === 0 && elements.length > 0) {
      const maps: Y.Map<unknown>[] = []
      elements.forEach((el, i) => {
        if (!el || typeof el !== 'object') return
        const m = new Y.Map<unknown>()
        m.set('el', { ...(el as object) })
        m.set('pos', posKey(i))
        maps.push(m)
      })
      if (maps.length > 0) yElements.push(maps)
    }

    const yAssets = doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
    for (const [id, file] of Object.entries(files)) {
      if (yAssets.has(id)) continue
      if (!file || typeof file !== 'object') continue
      const trimmed = trimOversizedAsset(file as Record<string, unknown>)
      if (trimmed) yAssets.set(id, trimmed)
    }
  }, origin)
}

function trimOversizedAsset(
  file: Record<string, unknown>
): Record<string, unknown> | null {
  const dataURL = file.dataURL
  if (typeof dataURL === 'string' && dataURL.length > WHITEBOARD_MAX_ASSET_CHARS) {
    return null
  }
  return { ...file }
}

/** Drop oversized assets already present (guard before publish / writeback). */
export function pruneOversizedWhiteboardAssets(doc: Y.Doc): number {
  const yAssets = doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
  let removed = 0
  const toDelete: string[] = []
  yAssets.forEach((value, key) => {
    if (!value || typeof value !== 'object') return
    const dataURL = (value as Record<string, unknown>).dataURL
    if (typeof dataURL === 'string' && dataURL.length > WHITEBOARD_MAX_ASSET_CHARS) {
      toDelete.push(key)
    }
  })
  if (toDelete.length > 0) {
    doc.transact(() => {
      for (const key of toDelete) {
        yAssets.delete(key)
        removed++
      }
    }, 'asset-guard')
  }
  return removed
}

function isValidExcalidrawElement(el: unknown): el is Record<string, unknown> {
  if (!el || typeof el !== 'object') return false
  const o = el as Record<string, unknown>
  return (
    typeof o.id === 'string' && typeof o.type === 'string' && typeof o.version === 'number'
  )
}

/** Mirror `@mizuka-wu/y-excalidraw` yjsToExcalidraw (sort by pos → el). */
export function yjsElementsToExcalidraw(
  yArray: Y.Array<Y.Map<unknown>>
): Record<string, unknown>[] {
  return yArray
    .toArray()
    .filter(Boolean)
    .sort((a, b) => {
      const key1 = String(a.get('pos') ?? '')
      const key2 = String(b.get('pos') ?? '')
      return key1 > key2 ? 1 : key1 < key2 ? -1 : 0
    })
    .map((x) => x.get('el'))
    .filter(isValidExcalidrawElement)
    .map((el) => ({ ...el }))
}

/** Project Doc → Excalidraw sceneJson for PNG / legacy `whiteboard_scenes`. */
export function whiteboardDocToSceneJson(doc: Y.Doc): string {
  const yElements = doc.getArray<Y.Map<unknown>>(WHITEBOARD_CRDT_ELEMENTS_KEY)
  const elements = yjsElementsToExcalidraw(yElements)
  const yAssets = doc.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
  const files: Record<string, unknown> = {}
  yAssets.forEach((value, key) => {
    if (value && typeof value === 'object') {
      const trimmed = trimOversizedAsset(value as Record<string, unknown>)
      if (trimmed) files[key] = trimmed
    }
  })
  return normalizeSceneJson(
    JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: 'lanpm',
      elements,
      appState: { viewBackgroundColor: LANPM_SURFACE_SOLID_HEX.light },
      files
    })
  )
}

export function emptyOrScene(sceneJson: string | null | undefined): string {
  if (!sceneJson || !sceneJson.trim()) return emptyWhiteboardSceneJson()
  return normalizeSceneJson(sceneJson)
}
