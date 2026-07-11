/** Group-scoped Excalidraw scene (one board per group · TASK-226). */

export interface WhiteboardScene {
  groupId: string
  /** Serialized Excalidraw document JSON (`elements` + `appState` + optional `files`). */
  sceneJson: string
  linkedTaskId?: string
  updatedAt: string
}

export interface SaveWhiteboardSceneInput {
  groupId: string
  sceneJson: string
  /** Pass `null` to clear; omit to leave unchanged when updating only scene. */
  linkedTaskId?: string | null
}

export interface ExportWhiteboardPngInput {
  groupId: string
  /** Raw PNG bytes as base64 (no data: URL prefix). */
  pngBase64: string
  fileName?: string
  /** When set, also post the file to group chat and reference the task. */
  linkedTaskId?: string
}

/** Minimal empty Excalidraw-compatible payload. */
export function emptyWhiteboardSceneJson(): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'lanpm',
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {}
  })
}

export function isNonEmptySceneJson(sceneJson: string): boolean {
  const t = sceneJson.trim()
  return t.length > 0 && t !== '{}'
}

/** Validate / normalize scene JSON string; throws on invalid JSON. */
export function normalizeSceneJson(sceneJson: string): string {
  if (typeof sceneJson !== 'string') throw new Error('sceneJson must be a string')
  const trimmed = sceneJson.trim()
  if (!trimmed) return emptyWhiteboardSceneJson()
  const parsed: unknown = JSON.parse(trimmed)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('sceneJson must be a JSON object')
  }
  return JSON.stringify(parsed)
}

export function buildWhiteboardScene(
  groupId: string,
  sceneJson: string,
  linkedTaskId: string | undefined,
  updatedAt: string
): WhiteboardScene {
  const scene: WhiteboardScene = {
    groupId,
    sceneJson: normalizeSceneJson(sceneJson),
    updatedAt
  }
  if (linkedTaskId) scene.linkedTaskId = linkedTaskId
  return scene
}
