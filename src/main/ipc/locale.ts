import { ipcMain } from 'electron'
import { LOCALE_IPC } from '../../shared/locale/channels'
import { isAppLocale } from '../../shared/locale/types'
import { readAppLocale, writeAppLocale } from '../locale/localeStore'

export function registerLocaleIpc(): void {
  ipcMain.handle(LOCALE_IPC.get, () => readAppLocale())

  ipcMain.handle(LOCALE_IPC.set, (_event, locale: unknown) => {
    if (!isAppLocale(locale)) {
      throw new Error('invalid locale')
    }
    return writeAppLocale(locale)
  })
}
