import { ipcMain } from 'electron'
import { NAV_IPC } from '../../shared/navigation/channels.ts'
import {
  normalizeNavPreferences,
  type NavPreferences
} from '../../shared/navigation/navPreferences.ts'
import {
  clearGroupNavOverride,
  readGroupNavPreferences,
  readNavPreferences,
  readNavPreferencesDocument,
  writeGroupNavPreferences,
  writeNavPreferences
} from '../navigation/navPreferencesStore.ts'

export function registerNavIpc(): void {
  ipcMain.handle(NAV_IPC.getDocument, () => readNavPreferencesDocument())

  ipcMain.handle(NAV_IPC.getPreferences, () => readNavPreferences())

  ipcMain.handle(NAV_IPC.setPreferences, (_event, prefs: unknown) => {
    if (!prefs || typeof prefs !== 'object') {
      throw new Error('invalid nav preferences')
    }
    const input = prefs as NavPreferences
    const normalized = normalizeNavPreferences(input)
    return writeNavPreferences(normalized)
  })

  ipcMain.handle(NAV_IPC.getGroupPreferences, (_event, groupId: unknown) => {
    if (typeof groupId !== 'string' || !groupId.trim()) {
      throw new Error('invalid group id')
    }
    return readGroupNavPreferences(groupId.trim())
  })

  ipcMain.handle(NAV_IPC.setGroupPreferences, (_event, groupId: unknown, prefs: unknown) => {
    if (typeof groupId !== 'string' || !groupId.trim()) {
      throw new Error('invalid group id')
    }
    if (!prefs || typeof prefs !== 'object') {
      throw new Error('invalid nav preferences')
    }
    return writeGroupNavPreferences(groupId.trim(), normalizeNavPreferences(prefs as NavPreferences))
  })

  ipcMain.handle(NAV_IPC.clearGroupOverride, (_event, groupId: unknown) => {
    if (typeof groupId !== 'string' || !groupId.trim()) {
      throw new Error('invalid group id')
    }
    return clearGroupNavOverride(groupId.trim())
  })
}
