/**
 * Y.Doc shape for `mindmap:{docId}` — flat node Map (SPIKE-2601).
 */
import * as Y from 'yjs'
import { emptyMindmapDataJson, normalizeMindmapDataJson } from './types.ts'

export const MINDMAP_CRDT_NODES_KEY = 'nodes'
export const MINDMAP_CRDT_LINKS_KEY = 'links'
export const MINDMAP_CRDT_META_KEY = 'meta'

interface FlatNode {
  id: string
  topic: string
  parentId: string | null
  childrenOrder: string[]
  attrs: Record<string, unknown>
}

interface MindNodeLike {
  id?: unknown
  topic?: unknown
  children?: unknown
  [key: string]: unknown
}

export function createEmptyMindmapDoc(): Y.Doc {
  const doc = new Y.Doc()
  doc.getMap(MINDMAP_CRDT_NODES_KEY)
  doc.getMap(MINDMAP_CRDT_LINKS_KEY)
  doc.getMap(MINDMAP_CRDT_META_KEY)
  return doc
}

export function encodeMindmapDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

export function encodeMindmapDocStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc)
}

export function encodeMindmapDocStateAsUpdate(
  doc: Y.Doc,
  targetStateVector?: Uint8Array
): Uint8Array {
  if (!targetStateVector || targetStateVector.byteLength === 0) {
    return Y.encodeStateAsUpdate(doc)
  }
  return Y.encodeStateAsUpdate(doc, targetStateVector)
}

export function applyMindmapEncodedUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  origin: unknown = null
): void {
  Y.applyUpdate(doc, update, origin)
}

function asNode(raw: unknown): MindNodeLike | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as MindNodeLike
}

function flattenNode(raw: unknown, parentId: string | null, out: FlatNode[]): void {
  const node = asNode(raw)
  if (!node || typeof node.id !== 'string' || !node.id) return
  const children = Array.isArray(node.children) ? node.children : []
  const childrenOrder: string[] = []
  for (const child of children) {
    const c = asNode(child)
    if (c && typeof c.id === 'string' && c.id) childrenOrder.push(c.id)
  }
  const rest: Record<string, unknown> = { ...node }
  delete rest.id
  delete rest.topic
  delete rest.children
  out.push({
    id: node.id,
    topic: typeof node.topic === 'string' ? node.topic : '',
    parentId,
    childrenOrder,
    attrs: rest
  })
  for (const child of children) flattenNode(child, node.id, out)
}

function rebuildTree(nodes: Map<string, FlatNode>, rootId: string): Record<string, unknown> {
  const rec = nodes.get(rootId)
  if (!rec) {
    return { id: rootId, topic: 'Mind map', root: true, children: [] }
  }
  const extras = [...nodes.values()].filter((n) => n.parentId === rootId).map((n) => n.id)
  const seen = new Set<string>()
  const childrenOrder: string[] = []
  for (const id of [...rec.childrenOrder, ...extras]) {
    if (!seen.has(id) && nodes.has(id)) {
      seen.add(id)
      childrenOrder.push(id)
    }
  }
  const children = childrenOrder.map((cid) => rebuildTree(nodes, cid))
  return {
    ...rec.attrs,
    id: rec.id,
    topic: rec.topic,
    children
  }
}

export function seedMindmapDocFromJson(
  doc: Y.Doc,
  dataJson: string,
  origin: unknown = 'seed'
): void {
  applyMindmapJsonToDoc(doc, dataJson, origin)
}

export function applyMindmapJsonToDoc(
  doc: Y.Doc,
  dataJson: string,
  origin: unknown = null
): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(normalizeMindmapDataJson(dataJson))
  } catch {
    parsed = JSON.parse(emptyMindmapDataJson('Mind map'))
  }
  const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
  const flats: FlatNode[] = []
  flattenNode(record.nodeData, null, flats)
  const linkData =
    record.linkData && typeof record.linkData === 'object' && !Array.isArray(record.linkData)
      ? (record.linkData as Record<string, unknown>)
      : {}
  const direction = typeof record.direction === 'number' ? record.direction : 1

  doc.transact(() => {
    const yNodes = doc.getMap<string>(MINDMAP_CRDT_NODES_KEY)
    const seen = new Set<string>()
    for (const n of flats) {
      seen.add(n.id)
      yNodes.set(n.id, JSON.stringify(n))
    }
    for (const key of [...yNodes.keys()]) {
      if (!seen.has(key)) yNodes.delete(key)
    }
    const yLinks = doc.getMap<string>(MINDMAP_CRDT_LINKS_KEY)
    const linkKeys = new Set(Object.keys(linkData))
    for (const [k, v] of Object.entries(linkData)) {
      yLinks.set(k, JSON.stringify(v))
    }
    for (const key of [...yLinks.keys()]) {
      if (!linkKeys.has(key)) yLinks.delete(key)
    }
    const yMeta = doc.getMap<string>(MINDMAP_CRDT_META_KEY)
    yMeta.set('direction', String(direction))
    const root = flats.find((n) => n.parentId === null)
    if (root) yMeta.set('rootId', root.id)
  }, origin)
}

export function mindmapDocToDataJson(doc: Y.Doc): string {
  const yNodes = doc.getMap<string>(MINDMAP_CRDT_NODES_KEY)
  const nodes = new Map<string, FlatNode>()
  yNodes.forEach((raw, id) => {
    try {
      const parsed = JSON.parse(raw) as FlatNode
      if (parsed && parsed.id) nodes.set(id, parsed)
    } catch {
      /* skip */
    }
  })
  const yMeta = doc.getMap<string>(MINDMAP_CRDT_META_KEY)
  const rootId = yMeta.get('rootId') ?? [...nodes.values()].find((n) => n.parentId === null)?.id
  if (!rootId || !nodes.has(rootId)) {
    return emptyMindmapDataJson('Mind map')
  }
  const yLinks = doc.getMap<string>(MINDMAP_CRDT_LINKS_KEY)
  const linkData: Record<string, unknown> = {}
  yLinks.forEach((raw, key) => {
    try {
      linkData[key] = JSON.parse(raw)
    } catch {
      /* skip */
    }
  })
  const direction = Number(yMeta.get('direction') ?? '1') || 1
  const nodeData = rebuildTree(nodes, rootId)
  if (nodeData && typeof nodeData === 'object') {
    ;(nodeData as Record<string, unknown>).root = true
  }
  return JSON.stringify({ nodeData, linkData, direction })
}
