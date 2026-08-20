import { BrowserWindow, ipcMain } from 'electron'

const UNLOCK_CHANNEL = 'lanpm:dbUnlockPassphrase'

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
    const { ipcRenderer } = require('electron')
    document.getElementById('f').addEventListener('submit', (e) => {
      e.preventDefault()
      ipcRenderer.send(${JSON.stringify(UNLOCK_CHANNEL)}, document.getElementById('p').value)
    })
    document.getElementById('q').addEventListener('click', () => {
      ipcRenderer.send(${JSON.stringify(UNLOCK_CHANNEL)}, null)
    })
  </script>
</body>
</html>`
}

/** Isolated window (nodeIntegration on this window only). Never logs the value. */
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
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false
      }
    })
    const finish = (value: string | null): void => {
      ipcMain.removeAllListeners(UNLOCK_CHANNEL)
      if (!win.isDestroyed()) win.close()
      const trimmed = typeof value === 'string' ? value : null
      resolve(trimmed && trimmed.length > 0 ? trimmed : null)
    }
    ipcMain.once(UNLOCK_CHANNEL, (_event, value: unknown) => {
      finish(typeof value === 'string' ? value : null)
    })
    win.on('closed', () => finish(null))
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(unlockHtml())}`)
  })
}
