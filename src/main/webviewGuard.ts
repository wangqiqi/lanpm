import { shell, type BrowserWindow, type WebContents } from 'electron'
import { isAllowedHttpUrl } from '../shared/security/httpUrl.ts'

/**
 * Harden guest <webview> / new-window navigation: only http(s); open popups externally.
 */
export function attachWebviewGuards(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    delete (webPreferences as { preload?: string }).preload
    delete (webPreferences as { preloadURL?: string }).preloadURL
  })

  mainWindow.webContents.on('did-attach-webview', (_event, guest: WebContents) => {
    guest.setWindowOpenHandler((details) => {
      if (isAllowedHttpUrl(details.url)) {
        void shell.openExternal(details.url)
      }
      return { action: 'deny' }
    })

    guest.on('will-navigate', (event, url) => {
      if (!isAllowedHttpUrl(url)) {
        event.preventDefault()
      }
    })
  })
}
