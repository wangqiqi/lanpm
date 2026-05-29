import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { initChatService, shutdownChatService } from './chat/chatService'
import { registerChatIpc } from './ipc/chat'
import { registerIdentityIpc } from './ipc/identity'
import { registerTaskIpc } from './ipc/task'
import { registerFileIpc } from './ipc/file'
import { registerGroupIpc, registerCockpitIpc } from './ipc/group'
import { registerSearchIpc } from './ipc/search'
import { registerNetworkIpc, registerBadgeIpc } from './ipc/network'
import { ensureSeedGroups } from './group/groupService'
import { initNetwork, shutdownNetwork } from './network'
import { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './storage'
import { resolveAppIconPath } from './appIcon'

const isDev = !app.isPackaged

/** Linux 无可用 GPU/Vulkan 时 Electron 会直接 FATAL 退出；开发环境禁用硬件加速 */
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
}

function startupErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('NODE_MODULE_VERSION') || msg.includes('better_sqlite3')) {
    return `${msg}\n\n请在本项目根目录执行：\nnpm run rebuild:native\n\n（勿单独 npm rebuild better-sqlite3，那会按系统 Node 编译，Electron 无法加载）`
  }
  return msg
}

function resolvePreloadPath(): string {
  const candidates = [
    join(__dirname, '../preload/index.js'),
    join(__dirname, '../preload/index.cjs'),
    join(__dirname, '../preload/index.mjs')
  ]
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!
}

function registerAllIpcHandlers(): void {
  registerIdentityIpc()
  registerChatIpc()
  registerTaskIpc()
  registerFileIpc()
  registerGroupIpc()
  registerCockpitIpc()
  registerSearchIpc()
  registerNetworkIpc()
  registerBadgeIpc()
}

function createWindow(): void {
  const iconPath = resolveAppIconPath()
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    title: 'LanPM',
    ...(iconPath ? { icon: iconPath } : {}),
    /** Linux/Windows：不显示 File/Edit/View 等原生菜单栏（应用内 TopBar 已承担导航） */
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setMenu(null)
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('[lanpm] renderer load failed:', code, desc, url)
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, err) => {
    console.error('[lanpm] preload failed:', preloadPath, err)
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
  try {
    Menu.setApplicationMenu(null)

    initDatabase()
    ensureSeedGroups(getDatabase())
    initNetwork(getDatabase())
    initChatService(getDatabase())
    registerAllIpcHandlers()
    if (!app.isPackaged) {
      console.info('[lanpm] SQLite ready at', getDatabasePath())
    }
    createWindow()
  } catch (err) {
    console.error('[lanpm] startup failed:', err)
    dialog.showErrorBox('LanPM 启动失败', startupErrorMessage(err))
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  shutdownChatService()
  shutdownNetwork()
  closeDatabase()
})
