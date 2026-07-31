import { ipcMain } from 'electron'
import { NAV_IPC } from '../../shared/navigation/channels.ts'
import { normalizeNavPreferences, type NavPreferences } from '../../shared/navigation/navPreferences.ts'
import { readNavPreferences, writeNavPreferences } from '../navigation/navPreferencesStore.ts'

export function registerNavIpc(): void {
  ipcMain.handle(NAV_IPC.getPreferences, () => readNavPreferences())

  ipcMain.handle(NAV_IPC.setPreferences, (_event, prefs: unknown) => {
    if (!prefs || typeof prefs !== 'object') {
      throw new Error('invalid nav preferences')
    }
    const input = prefs as NavPreferences
    const normalized = normalizeNavPreferences(input)
    return writeNavPreferences(normalized)
  })
}
