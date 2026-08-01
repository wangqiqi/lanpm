/** Group-scoped mind map documents (SPIKE-2301 · TASK-2301). */

export interface MindmapDocument {
  docId: string
  groupId: string
  title: string
  /** JSON file in group `files` table (mind-elixir data). */
  fileId: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface MindmapDocumentSummary {
  docId: string
  groupId: string
  title: string
  updatedAt: string
}

export interface MindmapDocumentLoad extends MindmapDocument {
  /** Parsed mind-elixir document JSON string. */
  dataJson: string
}

export interface CreateMindmapInput {
  groupId: string
  title?: string
}

export interface SaveMindmapInput {
  docId: string
  dataJson: string
}

export interface RenameMindmapInput {
  docId: string
  title: string
}

export interface ExportMindmapPngInput {
  groupId: string
  docId: string
  pngBase64: string
  fileName?: string
  /** When true, post exported PNG to group chat. */
  shareToChat?: boolean
}

const MINDMAP_FILE_EXT = 'lanpm-mindmap.json'

export function mindmapFileName(title: string): string {
  const safe = title.trim().replace(/[^\w.\-()\u4e00-\u9fff]+/g, '_') || 'mindmap'
  return `${safe}.${MINDMAP_FILE_EXT}`
}

/** Minimal mind-elixir-compatible empty document. */
export function emptyMindmapDataJson(rootTopic: string): string {
  return JSON.stringify({
    nodeData: {
      id: 'root',
      topic: rootTopic,
      root: true,
      children: []
    },
    linkData: {},
    direction: 1
  })
}

export function normalizeMindmapDataJson(dataJson: string): string {
  if (typeof dataJson !== 'string') throw new Error('dataJson must be a string')
  const trimmed = dataJson.trim()
  if (!trimmed) return emptyMindmapDataJson('Mind map')
  const parsed: unknown = JSON.parse(trimmed)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('dataJson must be a JSON object')
  }
  return JSON.stringify(parsed)
}
