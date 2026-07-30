/**
 * Playwright Electron fixture — isolated userData + stub network (worker-scoped).
 */
import { spawnSync } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { test as base, expect, type Page } from '@playwright/test'
import { _electron as electron, type ElectronApplication } from 'playwright'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkLanpmTemp, rmLanpmTemp } from '../../lanpmTemp.ts'
import { resolveElectronBin } from '../../../scripts/resolve-electron-bin.mjs'
import { electronCiChromiumFlags } from '../../../scripts/electron-ci-chromium-flags.mjs'
import { completeSetupWizard, openDiscoverModal, discoverDialog, dismissAllModals } from './setup.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const mainJs = join(root, 'out/main/index.js')

function killProcessTree(pid: number): void {
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

async function waitForMainWindow(app: ElectronApplication): Promise<Page> {
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

async function launchLanpmElectron(userDataDir: string): Promise<ElectronApplication> {
  const electronBin = resolveElectronBin()
  if (!electronBin) {
    throw new Error('electron binary missing — run npm install')
  }
  if (!existsSync(mainJs)) {
    throw new Error('out/main/index.js missing — run npm run build first')
  }
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  env.LANPM_E2E = '1'
  env.LANPM_USER_DATA = userDataDir
  env.LANPM_NETWORK = 'real'
  env.LANPM_TCP_PORT = String(randomInt(45_000, 55_000))

  return electron.launch({
    executablePath: electronBin,
    args: [...electronCiChromiumFlags(), mainJs],
    cwd: root,
    env,
    timeout: 120_000
  })
}

async function closeElectronApp(app: ElectronApplication): Promise<void> {
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

export type ElectronFixtures = {
  userDataDir: string
  electronApp: ElectronApplication
  appPage: Page
}

export const test = base.extend<ElectronFixtures>({
  userDataDir: [
    async (_, use) => {
      const dir = mkLanpmTemp('lanpm-e2e-')
      await use(dir)
      rmLanpmTemp(dir)
    },
    { scope: 'worker' }
  ],
  electronApp: [
    async ({ userDataDir }, use) => {
      let app: ElectronApplication | null = null
      let lastErr: unknown
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          app = await launchLanpmElectron(userDataDir)
          break
        } catch (err) {
          lastErr = err
        }
      }
      if (!app) throw lastErr ?? new Error('electron launch failed')

      try {
        await use(app)
      } finally {
        await closeElectronApp(app)
      }
    },
    { scope: 'worker' }
  ],
  appPage: [
    async ({ electronApp }, use) => {
      const page = await waitForMainWindow(electronApp)
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.error('[e2e:renderer]', msg.text())
      })
      page.on('pageerror', (err) => console.error('[e2e:pageerror]', err.message))
      await page.waitForLoadState('load', { timeout: 90_000 })
      await completeSetupWizard(page)
      await use(page)
    },
    { scope: 'worker' }
  ]
})

export { expect }
export { completeSetupWizard, openDiscoverModal, discoverDialog, dismissAllModals }
