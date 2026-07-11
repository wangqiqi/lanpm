import { ipcMain } from 'electron'
import { DATA_IPC } from '../../shared/data/channels'
import type { BundleConflictMode, GroupBundleExportResult } from '../../shared/data/bundle'
import {
  assertBundleConflictMode,
  assertBundlePassword
} from '../../shared/data/bundle'
import type { ClearGroupMessagesMode, DataCleanupOptions } from '../../shared/data/types'
import {
  exportGroupBundle,
  importGroupBundle,
  previewGroupBundle
} from '../data/bundleService'
import {
  clearGroupMessagesLocal,
  getStorageSettings,
  getStorageUsage,
  runDataCleanup,
  updateLocalRetentionDays
} from '../data/dataService'
import { listDistinctDmGroupIds } from '../storage/repositories/messageRepository'
import { getDatabase } from '../storage'
import { showOpenDialog, showSaveDialog } from '../systemDialog'

export function registerDataIpc(): void {
  ipcMain.handle(DATA_IPC.getStorageSettings, () => getStorageSettings(getDatabase()))

  ipcMain.handle(DATA_IPC.getStorageUsage, () => getStorageUsage(getDatabase()))

  ipcMain.handle(DATA_IPC.setLocalRetentionDays, (_event, days: number) => {
    if (typeof days !== 'number') throw new Error('days required')
    return updateLocalRetentionDays(getDatabase(), days)
  })

  ipcMain.handle(DATA_IPC.runCleanup, (_event, options: DataCleanupOptions) => {
    if (!options || typeof options !== 'object') throw new Error('options required')
    return runDataCleanup(getDatabase(), options)
  })

  ipcMain.handle(
    DATA_IPC.clearGroupMessages,
    (_event, groupId: string, mode: ClearGroupMessagesMode) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (mode !== 'older_than_retention' && mode !== 'all_local') {
        throw new Error('invalid mode')
      }
      return clearGroupMessagesLocal(getDatabase(), groupId, mode)
    }
  )

  ipcMain.handle(DATA_IPC.listDmGroupIds, () => listDistinctDmGroupIds(getDatabase()))

  ipcMain.handle(
    DATA_IPC.exportGroupBundle,
    async (
      _event,
      groupId: string,
      password: string,
      includeFileBodies?: boolean
    ) => {
      if (!groupId) throw new Error('groupId required')
      assertBundlePassword(password)
      const result = await showSaveDialog(null, {
        defaultPath: `${groupId}.lanpm-bundle.json`
      })
      if (result.canceled || !result.filePath) return null
      const path = result.filePath
      const exportMeta = exportGroupBundle(
        getDatabase(),
        groupId,
        password,
        path,
        !!includeFileBodies
      )
      return { path, ...exportMeta } satisfies GroupBundleExportResult & { path: string }
    }
  )

  ipcMain.handle(DATA_IPC.previewGroupBundle, async (_event, password: string) => {
    assertBundlePassword(password)
    const picked = await showOpenDialog(null, {
      filters: [{ name: 'LanPM Bundle', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (picked.canceled || !picked.filePaths[0]) return null
    const path = picked.filePaths[0]
    const preview = previewGroupBundle(getDatabase(), path, password)
    return { path, preview }
  })

  ipcMain.handle(
    DATA_IPC.importGroupBundle,
    async (
      _event,
      password: string,
      conflictMode: BundleConflictMode,
      filePath?: string
    ) => {
      assertBundlePassword(password)
      const mode = assertBundleConflictMode(conflictMode ?? 'skip')
      let path = typeof filePath === 'string' && filePath ? filePath : null
      if (!path) {
        const picked = await showOpenDialog(null, {
          filters: [{ name: 'LanPM Bundle', extensions: ['json'] }],
          properties: ['openFile']
        })
        if (picked.canceled || !picked.filePaths[0]) return null
        path = picked.filePaths[0]
      }
      return importGroupBundle(getDatabase(), path, password, mode)
    }
  )
}
