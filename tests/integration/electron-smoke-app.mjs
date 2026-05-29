/**
 * AUTO-19：Electron 无头 smoke（由 electron 二进制直接执行，非 ELECTRON_RUN_AS_NODE）。
 * 加载已构建的 renderer + preload，确认 #root 挂载。
 */
import { app, BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const rendererHtml = join(root, 'out/renderer/index.html')
const preloadJs = join(root, 'out/preload/index.js')

if (!existsSync(rendererHtml)) {
  console.error('[electron-smoke] missing', rendererHtml, '— run npm run build first')
  process.exit(1)
}
if (!existsSync(preloadJs)) {
  console.error('[electron-smoke] missing', preloadJs, '— run npm run build first')
  process.exit(1)
}

if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
}

const SMOKE_MS = 45_000

function fail(msg) {
  console.error('[electron-smoke]', msg)
  app.exit(1)
}

app.whenReady().then(async () => {
  const timer = setTimeout(() => fail('timeout waiting for renderer mount'), SMOKE_MS)

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: preloadJs,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.on('did-fail-load', (_e, code, desc) => {
    clearTimeout(timer)
    fail(`did-fail-load ${code} ${desc}`)
  })

  try {
    await win.loadFile(rendererHtml)
    const mounted = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const deadline = Date.now() + 20000
        const tick = () => {
          const el = document.getElementById('root')
          if (el && el.childElementCount > 0) return resolve(true)
          if (Date.now() > deadline) return resolve(false)
          requestAnimationFrame(tick)
        }
        tick()
      })
    `)
    if (!mounted) {
      clearTimeout(timer)
      fail('#root did not mount within 20s')
    }
    clearTimeout(timer)
    console.log('[electron-smoke] ok — renderer mounted')
    app.exit(0)
  } catch (err) {
    clearTimeout(timer)
    fail(err instanceof Error ? err.message : String(err))
  }
})
