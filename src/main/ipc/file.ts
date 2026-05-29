import { ipcMain } from 'electron'
import type { FileCategory } from '../../shared/file/types'
import { FILE_IPC } from '../../shared/file/channels'
import {
  createBookmark,
  exportGroupBookmarks,
  pickAndImportBookmarks
} from '../file/bookmarkService'
import {
  listGroupFiles,
  listGroupTransfers,
  pickAndUploadFile,
  readPreviewText,
  resolvePreviewUrl,
  uploadFileFromPath
} from '../file/fileService'
import { getDatabase } from '../storage'

export function registerFileIpc(): void {
  ipcMain.handle(FILE_IPC.list, (_event, groupId: string, category?: FileCategory) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupFiles(getDatabase(), groupId, category)
  })

  ipcMain.handle(FILE_IPC.upload, (_event, groupId: string, filePath?: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    if (filePath && typeof filePath === 'string') {
      return uploadFileFromPath(getDatabase(), groupId, filePath)
    }
    return pickAndUploadFile(getDatabase(), groupId)
  })

  ipcMain.handle(FILE_IPC.getPreviewUrl, (_event, fileId: string) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('fileId required')
    return resolvePreviewUrl(getDatabase(), fileId)
  })

  ipcMain.handle(FILE_IPC.getPreviewText, (_event, fileId: string) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('fileId required')
    return readPreviewText(getDatabase(), fileId)
  })

  ipcMain.handle(FILE_IPC.listTransfers, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupTransfers(getDatabase(), groupId)
  })

  ipcMain.handle(
    FILE_IPC.addBookmark,
    (_event, groupId: string, url: string, title: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof url !== 'string' || !url) throw new Error('url required')
      return createBookmark(getDatabase(), groupId, url, title ?? '')
    }
  )

  ipcMain.handle(FILE_IPC.importBookmarks, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return pickAndImportBookmarks(getDatabase(), groupId)
  })

  ipcMain.handle(FILE_IPC.exportBookmarks, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return exportGroupBookmarks(getDatabase(), groupId)
  })
}
