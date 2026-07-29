import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import { existsSync, mkdirSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { initChatService, shutdownChatService } from './chat/chatService'
import { registerChatIpc } from './ipc/chat'
import { registerIdentityIpc } from './ipc/identity'
import { registerTaskIpc } from './ipc/task'
import { registerFileIpc } from './ipc/file'
import { repairFilePreviewPaths } from './storage/repositories/fileRepository'
import { repairFileStoragePaths } from './file/storagePathResolver'
import { registerGroupIpc, registerCockpitIpc } from './ipc/group'
import { registerSearchIpc } from './ipc/search'
import { registerDiscoverIpc } from './ipc/discover'
import { registerDataIpc } from './ipc/data'
import { registerNetworkIpc, registerBadgeIpc } from './ipc/network'
import { registerWhiteboardIpc } from './ipc/whiteboard'
import { registerPluginIpc } from './ipc/plugin'
import { registerNotificationIpc } from './ipc/notification'
import { registerAiIpc } from './ipc/ai'
import { initAiPatrolScheduler, shutdownAiPatrolScheduler } from './ai/aiPatrolScheduler'
import { ensureSeedGroups } from './group/groupService'
import { initNetwork, shutdownNetwork } from './network'
import { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './storage'
import { ensureProfileUserDataPath } from './storage/profilePaths'
import { resolveWindowIcon } from './appIcon'
import { registerPreviewProtocol, registerPreviewScheme } from './file/previewProtocol'
import { initScreenshotService, shutdownScreenshotService } from './screenshot/screenshotService'
import { LANPM_MAIN_WINDOW_TITLE, setMainWindow } from './mainWindow'
import { runVisualCaptureIfRequested } from './visualCapture'
import { attachWebviewGuards } from './webviewGuard'
import { isAllowedHttpUrl } from '../shared/security/httpUrl'

/** Windows 通知 / 任务栏分组须在 ready 前设置；显示名避免 toast 标题为 Electron */
if (process.platform === 'win32') {
  app.setAppUserModelId('com.lanpm.app')
}
app.setName('LanPM')

const isDev = !app.isPackaged
const visualCaptureDir = process.env.LANPM_VISUAL_CAPTURE_DIR

if (visualCaptureDir) {
  // Prefer repo-local temp (gitignore) over OS /tmp — avoids disk clutter across CI/dev runs
  const fallbackRoot = join(process.cwd(), '.lanpm', 'tmp')
  mkdirSync(fallbackRoot, { recursive: true })
  const userData =
    process.env.LANPM_USER_DATA ?? mkdtempSync(join(fallbackRoot, 'lanpm-visual-cap-'))
  process.env.LANPM_USER_DATA = userData
  app.setPath('userData', userData)
  process.env.LANPM_NETWORK = process.env.LANPM_NETWORK ?? 'stub'
}

registerPreviewScheme()

/** Linux 无可用 GPU/Vulkan 时 Electron 会直接 FATAL 退出；开发环境禁用硬件加速 */
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  /** 无头/旧 libva 时避免 stderr：Installed VAAPI version is too old */
  app.commandLine.appendSwitch('disable-accelerated-video-decode')
  app.commandLine.appendSwitch('disable-accelerated-video-encode')
}

function startupErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('NODE_MODULE_VERSION') || msg.includes('better_sqlite3')) {
    return `${msg}\n\n请在本项目根目录执行：\nnpm run ensure:native\n\n（开发/构建前会自动检测并重编；勿单独 npm rebuild better-sqlite3）`
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
  registerDiscoverIpc()
  registerDataIpc()
  registerWhiteboardIpc()
  registerPluginIpc()
  registerNotificationIpc()
  registerAiIpc()
}

function createWindow(): BrowserWindow {
  const windowIcon = resolveWindowIcon()
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    /** 无头截图：Linux 默认不绘制隐藏窗；透明区 capture 易变黑底 */
    ...(visualCaptureDir
      ? { backgroundColor: '#f5f5f7', paintWhenInitiallyHidden: true, show: true }
      : {}),
    title: LANPM_MAIN_WINDOW_TITLE,
    ...(windowIcon ? { icon: windowIcon } : {}),
    /** Linux/Windows：不显示 File/Edit/View 等原生菜单栏（应用内 TopBar 已承担导航） */
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.setMenu(null)
  mainWindow.setMenuBarVisibility(false)
  if (windowIcon) {
    mainWindow.setIcon(windowIcon)
  }

  mainWindow.on('ready-to-show', () => {
    if (!visualCaptureDir) {
      mainWindow.maximize()
      mainWindow.show()
    }
  })

  if (visualCaptureDir) {
    mainWindow.webContents.once('did-finish-load', () => {
      void runVisualCaptureIfRequested(mainWindow).catch((err) => {
        console.error('[lanpm:visual-capture] failed:', err)
        app.exit(1)
      })
    })
  }

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('[lanpm] renderer load failed:', code, desc, url)
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, err) => {
    console.error('[lanpm] preload failed:', preloadPath, err)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedHttpUrl(details.url)) {
      void shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })
  attachWebviewGuards(mainWindow)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setMainWindow(mainWindow)
  return mainWindow
}

app.whenReady().then(() => {
  try {
    Menu.setApplicationMenu(null)

    if (!visualCaptureDir) {
      ensureProfileUserDataPath()
    }
    initDatabase()
    repairFilePreviewPaths(getDatabase())
    repairFileStoragePaths(getDatabase())
    registerPreviewProtocol(getDatabase)
    ensureSeedGroups(getDatabase())
    initNetwork(getDatabase())
    initChatService(getDatabase())
    initAiPatrolScheduler(getDatabase())
    initScreenshotService()
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
  shutdownAiPatrolScheduler()
  shutdownScreenshotService()
  shutdownChatService()
  shutdownNetwork()
  closeDatabase()
})
