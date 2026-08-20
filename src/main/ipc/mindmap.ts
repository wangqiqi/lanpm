import { ipcMain } from 'electron'
import { MINDMAP_IPC } from '../../shared/mindmap/channels.ts'
import type {
  CreateMindmapInput,
  ExportMindmapPngInput,
  RenameMindmapInput,
  SaveMindmapInput
} from '../../shared/mindmap/types.ts'
import { getDatabase } from '../storage/index.ts'
import {
  createMindmapDocument,
  exportMindmapPngToGroup,
  listGroupMindmaps,
  loadMindmapDocument,
  removeMindmapDocument,
  renameMindmapDocument,
  saveMindmapDocument
} from '../mindmap/mindmapService.ts'
import { applyRendererMindmapUpdate, ensureMindmapCrdtWired } from '../mindmap/mindmapCrdtService.ts'
import { applyRendererMindmapAwareness, ensureMindmapAwarenessWired } from '../mindmap/mindmapAwarenessService.ts'
import { getMindmapDocStateBase64, loadOrCreateMindmapDoc } from '../mindmap/mindmapCrdtStore.ts'
import { getMindmapDocument } from '../storage/repositories/mindmapRepository.ts'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'

export function registerMindmapIpc(): void {
  ipcMain.handle(MINDMAP_IPC.list, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupMindmaps(getDatabase(), groupId)
  })

  ipcMain.handle(MINDMAP_IPC.create, async (_event, input: CreateMindmapInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    if (typeof input.groupId !== 'string' || !input.groupId) throw new Error('groupId required')
    return createMindmapDocument(getDatabase(), input)
  })

  ipcMain.handle(MINDMAP_IPC.load, (_event, docId: string) => {
    if (typeof docId !== 'string' || !docId) throw new Error('docId required')
    return loadMindmapDocument(getDatabase(), docId)
  })

  ipcMain.handle(MINDMAP_IPC.save, (_event, input: SaveMindmapInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    if (typeof input.docId !== 'string' || !input.docId) throw new Error('docId required')
    if (typeof input.dataJson !== 'string') throw new Error('dataJson required')
    return saveMindmapDocument(getDatabase(), input)
  })

  ipcMain.handle(MINDMAP_IPC.rename, (_event, input: RenameMindmapInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    if (typeof input.docId !== 'string' || !input.docId) throw new Error('docId required')
    if (typeof input.title !== 'string') throw new Error('title required')
    return renameMindmapDocument(getDatabase(), input)
  })

  ipcMain.handle(MINDMAP_IPC.delete, (_event, docId: string) => {
    if (typeof docId !== 'string' || !docId) throw new Error('docId required')
    removeMindmapDocument(getDatabase(), docId)
    return { ok: true as const }
  })

  ipcMain.handle(MINDMAP_IPC.exportPng, async (_event, input: ExportMindmapPngInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    return exportMindmapPngToGroup(getDatabase(), input)
  })

  ipcMain.handle(MINDMAP_IPC.getDocState, (_event, docId: string) => {
    if (typeof docId !== 'string' || !docId) throw new Error('docId required')
    const db = getDatabase()
    const meta = getMindmapDocument(db, docId)
    if (!meta) throw new Error('mindmap document not found')
    const anonymous = isAnonymousGroupType(resolveGroupType(db, meta.groupId))
    if (!anonymous) {
      ensureMindmapCrdtWired(db, docId)
      ensureMindmapAwarenessWired(db, docId)
      loadOrCreateMindmapDoc(db, docId)
    }
    return {
      docId,
      groupId: meta.groupId,
      anonymous,
      updateBase64: anonymous ? '' : getMindmapDocStateBase64(db, docId)
    }
  })

  ipcMain.handle(
    MINDMAP_IPC.publishUpdate,
    (_event, input: { docId: string; updateBase64: string }) => {
      if (!input || typeof input.docId !== 'string' || !input.docId) {
        throw new Error('docId required')
      }
      if (typeof input.updateBase64 !== 'string' || !input.updateBase64) {
        throw new Error('updateBase64 required')
      }
      applyRendererMindmapUpdate(getDatabase(), input.docId, input.updateBase64)
    }
  )

  ipcMain.handle(
    MINDMAP_IPC.publishAwareness,
    (_event, input: { docId: string; updateBase64: string }) => {
      if (!input || typeof input.docId !== 'string' || !input.docId) {
        throw new Error('docId required')
      }
      if (typeof input.updateBase64 !== 'string' || !input.updateBase64) {
        throw new Error('updateBase64 required')
      }
      applyRendererMindmapAwareness(getDatabase(), input.docId, input.updateBase64)
    }
  )
}
