/**
 * Cold-start the Linux unpacked installer until nav-tab-chat is clickable (TASK-6103).
 * Skips when dist/linux-unpacked/lanpm is missing unless LANPM_REQUIRE_INSTALLER=1.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { _electron as electron } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const unpackedBin = join(root, 'dist', 'linux-unpacked', 'lanpm')
const requireInstaller = process.env.LANPM_REQUIRE_INSTALLER === '1'

function findArtifact(pred) {
  const distDir = join(root, 'dist')
  if (!existsSync(distDir)) return null
  return readdirSync(distDir).find(pred) ?? null
}

async function waitForLanpmWindow(app, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const window of app.windows()) {
      const title = await window.title().catch(() => '')
      if (title.includes('LanPM')) return window
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return app.firstWindow()
}

if (process.platform !== 'linux') {
  console.log('linux-installer-smoke: skip (not linux)')
  process.exit(0)
}

const appImage = findArtifact((n) => n.endsWith('.AppImage') && n.includes('LanPM') && !n.includes('arm64'))
const deb = findArtifact((n) => n.endsWith('_amd64.deb') && n.startsWith('lanpm_'))

if (!existsSync(unpackedBin)) {
  const msg = 'linux-installer-smoke: dist/linux-unpacked/lanpm missing — run npm run dist:linux:x64'
  if (requireInstaller) {
    console.error(msg)
    process.exit(1)
  }
  console.log(`${msg} (skip; set LANPM_REQUIRE_INSTALLER=1 to fail)`)
  process.exit(0)
}

if (!appImage || !deb) {
  const msg = `linux-installer-smoke: expected x64 AppImage + amd64 deb (AppImage=${appImage} deb=${deb})`
  if (requireInstaller) {
    console.error(msg)
    process.exit(1)
  }
  console.warn(msg)
}

if (process.env.CI === 'true' || process.env.CI === '1') {
  if (!requireInstaller) {
    console.log('linux-installer-smoke: skip launch on CI (set LANPM_REQUIRE_INSTALLER=1 with xvfb to force)')
    process.exit(0)
  }
}

spawnSync('pkill', ['-f', `${root}/dist/linux-unpacked/lanpm`], { encoding: 'utf8' })

const tmpRoot = join(root, '.lanpm', 'tmp')
mkdirSync(tmpRoot, { recursive: true })
const userDataDir = mkdtempSync(join(tmpRoot, 'lanpm-installer-smoke-'))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.LANPM_E2E = '1'
env.LANPM_USER_DATA = userDataDir
env.LANPM_NETWORK = env.LANPM_NETWORK || 'stub'
env.LANPM_E2E_NAME = 'InstallerSmoke'

const t0 = Date.now()
let app
try {
  app = await electron.launch({
    executablePath: unpackedBin,
    args: [
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-dev-shm-usage'
    ],
    cwd: join(root, 'dist', 'linux-unpacked'),
    env,
    timeout: 120_000
  })
  const page = await waitForLanpmWindow(app)
  if (app.windows().length === 0) {
    throw new Error('no BrowserWindow — packaged app likely exited (single-instance lock?)')
  }
  await page.waitForLoadState('load', { timeout: 90_000 }).catch(() => {})
  const chat = page.locator('[data-testid="nav-tab-chat"], [data-testid="topbar-discover"]')
  try {
    await chat.first().waitFor({ state: 'visible', timeout: 120_000 })
  } catch (err) {
    const title = await page.title().catch(() => '')
    const url = page.url()
    console.error(`linux-installer-smoke: no chat/discover title=${title} url=${url}`)
    throw err
  }
  const navChat = page.locator('[data-testid="nav-tab-chat"]')
  if ((await navChat.count()) > 0) {
    await navChat.click()
    await page.waitForFunction(
      () => document.querySelector('[data-testid="nav-tab-chat"]')?.getAttribute('aria-current') === 'page',
      null,
      { timeout: 30_000 }
    )
  }
  const coldMs = Date.now() - t0
  console.log(
    `linux-installer-smoke OK coldMs=${coldMs} AppImage=${appImage} deb=${deb} unpacked=${unpackedBin}`
  )
} finally {
  if (app) await app.close().catch(() => {})
  rmSync(userDataDir, { recursive: true, force: true })
}
