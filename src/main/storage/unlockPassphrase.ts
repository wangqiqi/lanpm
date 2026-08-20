import { existsSync } from 'fs'
import { join } from 'path'
import { BrowserWindow, ipcMain } from 'electron'
import { DB_UNLOCK_CHANNEL } from '../../shared/data/dbUnlock.ts'

function resolveUnlockPreloadPath(): string {
  const candidates = [
    join(__dirname, '../preload/unlock.js'),
    join(__dirname, '../preload/unlock.cjs'),
    join(__dirname, '../preload/unlock.mjs')
  ]
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!
}

function unlockHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>LanPM</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #1a1a1a; }
    p { line-height: 1.5; }
    input { width: 100%; box-sizing: border-box; padding: 8px; margin: 12px 0; }
    .row { display: flex; gap: 8px; justify-content: flex-end; }
  </style>
</head>
<body>
  <p>本机数据库已加密。输入通行词解锁。忘记通行词则无法打开库内数据。</p>
  <form id="f">
    <input id="p" type="password" autocomplete="current-password" autofocus minlength="8" />
    <div class="row">
      <button type="button" id="q">退出</button>
      <button type="submit">解锁</button>
    </div>
  </form>
  <script>
    document.getElementById('f').addEventListener('submit', (e) => {
      e.preventDefault()
      window.lanpmUnlock.submit(document.getElementById('p').value)
    })
    document.getElementById('q').addEventListener('click', () => {
      window.lanpmUnlock.submit(null)
    })
  </script>
</body>
</html>`
}

/** Isolated BrowserWindow: preload + contextIsolation; never logs the value. */
export function promptDatabasePassphrase(): Promise<string | null> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 440,
      height: 260,
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: resolveUnlockPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })
    let settled = false
    const onUnlock = (_event: Electron.IpcMainEvent, value: unknown): void => {
      finish(typeof value === 'string' ? value : null)
    }
    const finish = (value: string | null): void => {
      if (settled) return
      settled = true
      ipcMain.removeListener(DB_UNLOCK_CHANNEL, onUnlock)
      if (!win.isDestroyed()) win.close()
      const trimmed = typeof value === 'string' ? value.trim() : null
      resolve(trimmed && trimmed.length > 0 ? trimmed : null)
    }
    ipcMain.on(DB_UNLOCK_CHANNEL, onUnlock)
    win.on('closed', () => finish(null))
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(unlockHtml())}`)
  })
}
