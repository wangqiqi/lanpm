import { spawnSync } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { _electron as electron, type ElectronApplication } from 'playwright'
import type { Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveElectronBin } from '../../../scripts/resolve-electron-bin.mjs'
import { electronCiChromiumFlags } from '../../../scripts/electron-ci-chromium-flags.mjs'
import { packageMainAbs } from '../../../scripts/lanpm-artifact-paths.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const mainJs = packageMainAbs(root)

export type LanpmLaunchOptions = {
  userDataDir: string
  baseName?: string
  tcpPort?: number
}

export function killProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)], { stdio: 'ignore', shell: true })
  } else {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* ignore */
      }
    }
  }
}

export async function waitForMainWindow(app: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    for (const window of app.windows()) {
      const title = await window.title().catch(() => '')
      if (title.includes('LanPM')) return window
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return app.firstWindow()
}

export async function launchLanpmElectron(options: LanpmLaunchOptions): Promise<ElectronApplication> {
  const electronBin = resolveElectronBin()
  if (!electronBin) {
    throw new Error('electron binary missing — run npm install')
  }
  if (!existsSync(mainJs)) {
    throw new Error('.lanpm/artifact/out/main/index.js missing — run npm run build first')
  }
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  env.LANPM_E2E = '1'
  env.LANPM_USER_DATA = options.userDataDir
  env.LANPM_NETWORK = 'real'
  if (options.baseName) {
    env.LANPM_E2E_NAME = options.baseName
  }
  env.LANPM_TCP_PORT = String(options.tcpPort ?? randomInt(45_000, 55_000))

  return electron.launch({
    executablePath: electronBin,
    args: [...electronCiChromiumFlags(), mainJs],
    cwd: root,
    env,
    timeout: 120_000
  })
}

export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  const proc = app.process()
  try {
    await Promise.race([
      app.close(),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('electron close timeout')), 15_000)
      })
    ])
  } catch {
    if (proc?.pid) killProcessTree(proc.pid)
  }
}

export async function prepareLanpmPage(app: ElectronApplication): Promise<Page> {
  const page = await waitForMainWindow(app)
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[e2e:renderer]', msg.text())
  })
  page.on('pageerror', (err) => console.error('[e2e:pageerror]', err.message))
  await page.waitForLoadState('load', { timeout: 90_000 })
  return page
}
