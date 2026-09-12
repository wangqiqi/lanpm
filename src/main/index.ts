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
import { registerPairingIpc } from './ipc/pairing'
import { registerDataIpc } from './ipc/data'
import { registerNetworkIpc, registerBadgeIpc } from './ipc/network'
import { registerWhiteboardIpc } from './ipc/whiteboard'
import { registerMindmapIpc } from './ipc/mindmap'
import { registerPluginIpc } from './ipc/plugin'
import { registerNavIpc } from './ipc/nav'
import { registerMeetingIpc } from './ipc/meeting'
import { registerOpsIpc } from './ipc/ops'
import { shutdownGateway } from './ops/gatewayService'
import { registerNotificationIpc } from './ipc/notification'
import { registerLocaleIpc } from './ipc/locale'
import { registerAiIpc } from './ipc/ai'
import { initAiPatrolScheduler, shutdownAiPatrolScheduler } from './ai/aiPatrolScheduler'
import {
  initMeetingReminderService,
  shutdownMeetingReminderService
} from './media/meetingReminderService'
import {
  initAiEndpointProbeScheduler,
  shutdownAiEndpointProbeScheduler
} from './ai/aiEndpointProbeService'
import { ensureSeedGroups } from './group/groupService'
import { completeSetup, getSetupStatus } from './identity/setup'
import { initNetwork, shutdownNetwork } from './network'
import { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './storage'
import { ensureProfileUserDataPath } from './storage/profilePaths'
import { probeSqliteAtRest } from './storage/sqliteAtRest'
import { resolveDbPassphrase } from './storage/dbPassphrase'
import { resolveWindowIcon, resolveAppIconPath } from './appIcon'
import { attachCloseToTray, hasSystemTray, initSystemTray } from './systemTray'
import { registerPreviewProtocol, registerPreviewScheme } from './file/previewProtocol'
import { initScreenshotService, shutdownScreenshotService } from './screenshot/screenshotService'
import { LANPM_MAIN_WINDOW_TITLE, setMainWindow } from './mainWindow'
import { runVisualCaptureIfRequested } from './visualCapture'
import { attachWebviewGuards } from './webviewGuard'
import { isAllowedHttpUrl } from '../shared/security/httpUrl'
import {
  LINUX_DISABLE_GPU_SWITCHES,
  shouldDisableLinuxGpu
} from '../shared/ops/linuxGpuPolicy'

/** Windows 通知 / 任务栏分组须在 ready 前设置；显示名避免 toast 标题为 Electron */
if (process.platform === 'win32') {
  app.setAppUserModelId('com.lanpm.app')
}
app.setName('LanPM')

const envUserDataDir = process.env.LANPM_USER_DATA?.trim()
if (envUserDataDir) {
  mkdirSync(envUserDataDir, { recursive: true })
  app.setPath('userData', envUserDataDir)
}

const visualCaptureDir = process.env.LANPM_VISUAL_CAPTURE_DIR
const e2eMode = process.env.LANPM_E2E === '1'
const isolatedLaunch = Boolean(visualCaptureDir || e2eMode)

if (visualCaptureDir || e2eMode) {
  // Prefer repo-local temp (gitignore) over OS /tmp — avoids disk clutter across CI/dev runs
  const fallbackRoot = join(process.cwd(), '.lanpm', 'tmp')
  mkdirSync(fallbackRoot, { recursive: true })
  const prefix = e2eMode ? 'lanpm-e2e-' : 'lanpm-visual-cap-'
  const userData =
    process.env.LANPM_USER_DATA ?? mkdtempSync(join(fallbackRoot, prefix))
  process.env.LANPM_USER_DATA = userData
  app.setPath('userData', userData)
  process.env.LANPM_NETWORK = process.env.LANPM_NETWORK ?? 'stub'
}

/** 托盘隐藏时进程仍占用 43124；禁止多开导致 EADDRINUSE */
if (!isolatedLaunch) {
  const gotSingleInstanceLock = app.requestSingleInstanceLock()
  if (!gotSingleInstanceLock) {
    app.quit()
  } else {
    app.on('second-instance', () => {
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
      if (!win) return
      if (!win.isVisible()) win.show()
      if (win.isMinimized()) win.restore()
      win.focus()
    })
  }
}

registerPreviewScheme()

const isDev = !app.isPackaged

/** Linux 无可用 GPU/Vulkan 时 Electron 会 FATAL；默认关加速。有独显：LANPM_ENABLE_GPU=1 */
if (shouldDisableLinuxGpu()) {
  app.disableHardwareAcceleration()
  for (const sw of LINUX_DISABLE_GPU_SWITCHES) {
    app.commandLine.appendSwitch(sw)
  }
}

function startupErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('NODE_MODULE_VERSION') || msg.includes('better_sqlite3')) {
    return `${msg}\n\n请在本项目根目录执行：\nnpm run ensure:native\n\n（开发/构建前会自动检测并重编；勿单独 npm rebuild better-sqlite3）`
  }
  if (msg === 'err.dbPassphraseRequired') return '数据库已加密，需要通行词（或设置 LANPM_DB_PASSPHRASE）。'
  if (msg === 'err.dbWrongPassphrase') return '通行词不正确，无法打开数据库。'
  if (msg === 'err.dbPassphraseTooShort') return '通行词至少 8 个字符。'
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
  registerPairingIpc()
  registerDataIpc()
  registerWhiteboardIpc()
  registerMindmapIpc()
  registerPluginIpc()
  registerNavIpc()
  registerMeetingIpc()
  registerOpsIpc()
  registerNotificationIpc()
  registerLocaleIpc()
  registerAiIpc()
}

function createWindow(): BrowserWindow {
  const windowIcon = resolveWindowIcon()
  if (!app.isPackaged) {
    console.info('[lanpm] window icon:', resolveAppIconPath() ?? '(missing — npm run build:icons)')
  }
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
    if (process.env.LANPM_MEASURE === '1') {
      console.log(`[lanpm:measure] ready-to-show ${Date.now()}`)
    }
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
  attachCloseToTray(mainWindow)

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setMainWindow(mainWindow)
  return mainWindow
}

app.whenReady().then(async () => {
  try {
    Menu.setApplicationMenu(null)

    if (!visualCaptureDir && !e2eMode) {
      ensureProfileUserDataPath()
    }
    const dbKind = probeSqliteAtRest(getDatabasePath())
    const passphrase = await resolveDbPassphrase({ kind: dbKind, allowPrompt: true })
    if (dbKind === 'encrypted' && !passphrase) {
      app.quit()
      return
    }
    initDatabase(passphrase ? { passphrase } : undefined)
    if (e2eMode && !getSetupStatus(getDatabase()).configured) {
      const baseName = process.env.LANPM_E2E_NAME?.trim() || 'E2ETest'
      completeSetup(getDatabase(), { baseName })
    }
    repairFilePreviewPaths(getDatabase())
    repairFileStoragePaths(getDatabase())
    registerPreviewProtocol(getDatabase)
    ensureSeedGroups(getDatabase())
    initNetwork(getDatabase())
    initChatService(getDatabase())
    initAiPatrolScheduler(getDatabase())
    initMeetingReminderService()
    initAiEndpointProbeScheduler(getDatabase())
    initScreenshotService()
    registerAllIpcHandlers()
    if (!app.isPackaged) {
      console.info('[lanpm] SQLite ready at', getDatabasePath())
    }
    initSystemTray()
    createWindow()
  } catch (err) {
    console.error('[lanpm] startup failed:', err)
    dialog.showErrorBox('LanPM 启动失败', startupErrorMessage(err))
    app.quit()
  }

  app.on('activate', () => {
    const existing = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
    if (existing) {
      if (!existing.isVisible()) existing.show()
      if (existing.isMinimized()) existing.restore()
      existing.focus()
      return
    }
    createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return
  if (hasSystemTray()) return
  app.quit()
})

app.on('will-quit', () => {
  shutdownAiEndpointProbeScheduler()
  shutdownMeetingReminderService()
  shutdownAiPatrolScheduler()
  shutdownScreenshotService()
  shutdownChatService()
  shutdownNetwork()
  void shutdownGateway()
  closeDatabase()
})
