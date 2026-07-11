import { ipcMain } from 'electron'
import { WHITEBOARD_IPC } from '../../shared/whiteboard/channels'
import type {
  ExportWhiteboardPngInput,
  SaveWhiteboardSceneInput
} from '../../shared/whiteboard/types'
import { getDatabase } from '../storage'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'
import {
  exportWhiteboardPngToGroup,
  loadWhiteboardScene,
  saveWhiteboardScene
} from '../whiteboard/whiteboardService'
import { applyRendererWhiteboardUpdate } from '../whiteboard/whiteboardCrdtService'
import { applyRendererWhiteboardAwareness } from '../whiteboard/whiteboardAwarenessService'
import {
  getWhiteboardDocStateBase64,
  loadOrCreateGroupWhiteboardDoc
} from '../whiteboard/whiteboardCrdtStore'
import { ensureWhiteboardCrdtWired } from '../whiteboard/whiteboardCrdtService'
import { ensureWhiteboardAwarenessWired } from '../whiteboard/whiteboardAwarenessService'

export function registerWhiteboardIpc(): void {
  ipcMain.handle(WHITEBOARD_IPC.getScene, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return loadWhiteboardScene(getDatabase(), groupId)
  })

  ipcMain.handle(WHITEBOARD_IPC.saveScene, (_event, input: SaveWhiteboardSceneInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    if (typeof input.groupId !== 'string' || !input.groupId) throw new Error('groupId required')
    if (typeof input.sceneJson !== 'string') throw new Error('sceneJson required')
    if (
      input.linkedTaskId !== undefined &&
      input.linkedTaskId !== null &&
      typeof input.linkedTaskId !== 'string'
    ) {
      throw new Error('linkedTaskId must be string or null')
    }
    return saveWhiteboardScene(getDatabase(), input)
  })

  ipcMain.handle(WHITEBOARD_IPC.exportPng, (_event, input: ExportWhiteboardPngInput) => {
    if (!input || typeof input !== 'object') throw new Error('input required')
    if (typeof input.groupId !== 'string' || !input.groupId) throw new Error('groupId required')
    if (typeof input.pngBase64 !== 'string' || !input.pngBase64) {
      throw new Error('pngBase64 required')
    }
    return exportWhiteboardPngToGroup(getDatabase(), input)
  })

  ipcMain.handle(WHITEBOARD_IPC.getDocState, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    const db = getDatabase()
    const anonymous = isAnonymousGroupType(resolveGroupType(db, groupId))
    if (!anonymous) {
      ensureWhiteboardCrdtWired(db, groupId)
      ensureWhiteboardAwarenessWired(db, groupId)
      loadOrCreateGroupWhiteboardDoc(db, groupId)
    }
    return {
      groupId,
      anonymous,
      updateBase64: anonymous ? '' : getWhiteboardDocStateBase64(db, groupId)
    }
  })

  ipcMain.handle(
    WHITEBOARD_IPC.publishUpdate,
    (_event, input: { groupId: string; updateBase64: string }) => {
      if (!input || typeof input.groupId !== 'string' || !input.groupId) {
        throw new Error('groupId required')
      }
      if (typeof input.updateBase64 !== 'string' || !input.updateBase64) {
        throw new Error('updateBase64 required')
      }
      applyRendererWhiteboardUpdate(getDatabase(), input.groupId, input.updateBase64)
    }
  )

  ipcMain.handle(
    WHITEBOARD_IPC.publishAwareness,
    (_event, input: { groupId: string; updateBase64: string }) => {
      if (!input || typeof input.groupId !== 'string' || !input.groupId) {
        throw new Error('groupId required')
      }
      if (typeof input.updateBase64 !== 'string' || !input.updateBase64) {
        throw new Error('updateBase64 required')
      }
      applyRendererWhiteboardAwareness(getDatabase(), input.groupId, input.updateBase64)
    }
  )
}
