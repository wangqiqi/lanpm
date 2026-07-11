import { ipcMain } from 'electron'
import { WHITEBOARD_IPC } from '../../shared/whiteboard/channels'
import type { SaveWhiteboardSceneInput } from '../../shared/whiteboard/types'
import { getDatabase } from '../storage'
import { loadWhiteboardScene, saveWhiteboardScene } from '../whiteboard/whiteboardService'

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
}
