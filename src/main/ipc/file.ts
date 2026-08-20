import { BrowserWindow, ipcMain } from 'electron'
import type { FileCategory } from '../../shared/file/types'
import { FILE_IPC } from '../../shared/file/channels'
import {
  createBookmark,
  exportGroupBookmarks,
  pickAndImportBookmarks
} from '../file/bookmarkService'
import {
  getFileTransferSettings,
  listGroupFiles,
  listGroupTransferHistory,
  listGroupTransfers,
  pickAndUploadFile,
  readPreviewText,
  resolvePreviewUrl,
  resumeTransfer,
  cancelTransfer,
  setFileTransferRateKbps,
  pullRemoteFile,
  downloadFileToDisk
} from '../file/fileService'
import { deleteFileLocally } from '../data/dataService'
import { getDatabase } from '../storage'
import { rejectRendererUploadPath } from '../../shared/fs/safeSegment.ts'

export function registerFileIpc(): void {
  ipcMain.handle(FILE_IPC.list, (_event, groupId: string, category?: FileCategory) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupFiles(getDatabase(), groupId, category)
  })

  ipcMain.handle(FILE_IPC.upload, (event, groupId: string, filePath?: unknown) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    rejectRendererUploadPath(filePath)
    const parent = BrowserWindow.fromWebContents(event.sender)
    return pickAndUploadFile(getDatabase(), groupId, parent)
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

  ipcMain.handle(FILE_IPC.listTransferHistory, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupTransferHistory(getDatabase(), groupId)
  })

  ipcMain.handle(FILE_IPC.resumeTransfer, (_event, transferId: string) => {
    if (typeof transferId !== 'string' || !transferId) throw new Error('transferId required')
    return resumeTransfer(getDatabase(), transferId)
  })

  ipcMain.handle(FILE_IPC.cancelTransfer, (_event, transferId: string) => {
    if (typeof transferId !== 'string' || !transferId) throw new Error('transferId required')
    return cancelTransfer(getDatabase(), transferId)
  })

  ipcMain.handle(FILE_IPC.getTransferSettings, () => getFileTransferSettings(getDatabase()))

  ipcMain.handle(FILE_IPC.setTransferRate, (_event, rateKbps: number) => {
    if (typeof rateKbps !== 'number' || !Number.isFinite(rateKbps) || rateKbps < 0) {
      throw new Error('rateKbps invalid')
    }
    // 上限由 setFileTransferRateKbps → clampFileTransferRateKbps 处理
    return setFileTransferRateKbps(getDatabase(), rateKbps)
  })

  ipcMain.handle(
    FILE_IPC.addBookmark,
    (_event, groupId: string, url: string, title: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof url !== 'string' || !url) throw new Error('url required')
      return createBookmark(getDatabase(), groupId, url, title ?? '')
    }
  )

  ipcMain.handle(FILE_IPC.importBookmarks, (event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    const parent = BrowserWindow.fromWebContents(event.sender)
    return pickAndImportBookmarks(getDatabase(), groupId, parent)
  })

  ipcMain.handle(FILE_IPC.exportBookmarks, (event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    const parent = BrowserWindow.fromWebContents(event.sender)
    return exportGroupBookmarks(getDatabase(), groupId, parent)
  })

  ipcMain.handle(FILE_IPC.pullRemote, (_event, fileId: string) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('fileId required')
    return pullRemoteFile(getDatabase(), fileId)
  })

  ipcMain.handle(FILE_IPC.download, (event, fileId: string) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('fileId required')
    const parent = BrowserWindow.fromWebContents(event.sender)
    return downloadFileToDisk(getDatabase(), fileId, parent)
  })

  ipcMain.handle(FILE_IPC.deleteLocal, (_event, fileId: string) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error('fileId required')
    return deleteFileLocally(getDatabase(), fileId)
  })
}
