import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIdentityIpc } from './ipc/identity'
import { initNetworkStub, shutdownNetworkStub } from './network/stub'
import { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './storage'

const isDev = !app.isPackaged

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    title: 'LanPM',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  initNetworkStub(getDatabase())
  registerIdentityIpc()
  if (!app.isPackaged) {
    console.info('[lanpm] SQLite ready at', getDatabasePath())
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  shutdownNetworkStub()
  closeDatabase()
})
