/**
 * Per-document mindmap Y.Doc (SPRINT-26). Blob in mindmap_crdt_docs; seed from JSON file.
 */
import type { Database } from 'better-sqlite3'
import type { Doc } from 'yjs'
import {
  applyMindmapEncodedUpdate,
  createEmptyMindmapDoc,
  encodeMindmapDocState,
  mindmapDocToDataJson,
  seedMindmapDocFromJson
} from '../../shared/mindmap/mindmapCrdtModel.ts'
import { emptyMindmapDataJson } from '../../shared/mindmap/types.ts'
import { getFileById, updateFileContent } from '../storage/repositories/fileRepository.ts'
import {
  getMindmapCrdtBlob,
  upsertMindmapCrdtBlob
} from '../storage/repositories/mindmapCrdtRepository.ts'
import {
  getMindmapDocument,
  touchMindmapDocument
} from '../storage/repositories/mindmapRepository.ts'
import { createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

type MindmapYDoc = Doc

const docs = new Map<string, MindmapYDoc>()

function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

export function loadOrCreateMindmapDoc(db: Database, docId: string): MindmapYDoc | null {
  const meta = getMindmapDocument(db, docId)
  if (!meta) return null
  const cached = docs.get(docId)
  if (cached) return cached

  const doc = createEmptyMindmapDoc()
  const stored = getMindmapCrdtBlob(db, docId)
  if (stored) {
    applyMindmapEncodedUpdate(doc, new Uint8Array(stored.updateBlob), 'load')
  } else {
    const file = getFileById(db, meta.fileId)
    let json = emptyMindmapDataJson(meta.title)
    if (file) {
      try {
        json = readFileSync(file.storagePath, 'utf8')
      } catch {
        /* seed empty */
      }
    }
    seedMindmapDocFromJson(doc, json, 'seed')
    persistMindmapDoc(db, docId, doc)
  }
  docs.set(docId, doc)
  return doc
}

export function persistMindmapDoc(db: Database, docId: string, doc?: MindmapYDoc): void {
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  const target = doc ?? docs.get(docId)
  if (!target) return
  const update = encodeMindmapDocState(target)
  upsertMindmapCrdtBlob(db, docId, meta.groupId, update)
  writebackMindmapJson(db, docId, target)
}

function writebackMindmapJson(db: Database, docId: string, doc: MindmapYDoc): void {
  const meta = getMindmapDocument(db, docId)
  if (!meta) return
  const file = getFileById(db, meta.fileId)
  if (!file) return
  const dataJson = mindmapDocToDataJson(doc)
  const buf = Buffer.from(dataJson, 'utf8')
  try {
    writeFileSync(file.storagePath, buf)
  } catch {
    return
  }
  const updatedAt = new Date().toISOString()
  updateFileContent(db, meta.fileId, {
    size: buf.length,
    sha256: sha256Buffer(buf),
    updatedAt
  })
  touchMindmapDocument(db, docId, updatedAt)
}

export function getMindmapDocStateBase64(db: Database, docId: string): string {
  const doc = loadOrCreateMindmapDoc(db, docId)
  if (!doc) return ''
  return Buffer.from(encodeMindmapDocState(doc)).toString('base64')
}

export function evictMindmapDoc(docId: string): void {
  const doc = docs.get(docId)
  if (doc) {
    doc.destroy()
    docs.delete(docId)
  }
}

export function clearMindmapCrdtDocCache(): void {
  for (const doc of docs.values()) doc.destroy()
  docs.clear()
}
