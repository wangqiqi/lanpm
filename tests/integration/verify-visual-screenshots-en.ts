/**
 * TASK-4901 — 英文 cockpit + chat 无头截图（不跑全量 18 PNG）。
 * Run: npm run verify:visual-screenshots-en
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { electronCiChromiumFlags } from '../../scripts/electron-ci-chromium-flags.mjs'
import { resolveElectronBin } from '../../scripts/resolve-electron-bin.mjs'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const electronBin = resolveElectronBin()
const mainJs = join(root, 'out/main/index.js')
const outDir = process.env.LANPM_VISUAL_CAPTURE_DIR ?? join(root, '.lanpm/visual-screenshots-en')

const THEME_PAGES = ['chat', 'cockpit'] as const
const THEMES = ['light', 'dark'] as const

const EXPECTED = [
  ...THEMES.map((theme) => `${theme}_setup`),
  ...THEMES.flatMap((theme) => THEME_PAGES.map((page) => `${theme}_${page}`))
] as const

assert.ok(electronBin, 'electron binary missing')
assert.ok(existsSync(mainJs), 'out/main/index.js missing — run npm run build first')

const userData = mkLanpmTemp('lanpm-visual-en-')

process.on('exit', () => {
  try {
    rmLanpmTemp(userData)
  } catch {
    /* ignore */
  }
})

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.LANPM_VISUAL_CAPTURE_DIR = outDir
env.LANPM_VISUAL_LOCALE = 'en-US'
env.LANPM_VISUAL_SLUGS = 'chat,cockpit'
env.LANPM_USER_DATA = userData
env.LANPM_NETWORK = 'stub'

const r = spawnSync(electronBin, [...electronCiChromiumFlags(), mainJs], {
  cwd: root,
  stdio: 'inherit',
  env,
  timeout: 300_000
})

if (r.error) {
  console.error('verify:visual-screenshots-en spawn error:', r.error.message)
  process.exit(1)
}
if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

const written = new Set(
  readdirSync(outDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, ''))
)

const missing = EXPECTED.filter((name) => !written.has(name))
assert.equal(missing.length, 0, `missing screenshots: ${missing.join(', ')} → ${outDir}`)

const MIN_BYTES = 8_000
for (const name of EXPECTED) {
  const path = join(outDir, `${name}.png`)
  const size = statSync(path).size
  assert.ok(size >= MIN_BYTES, `${name}.png too small (${size} B) — blank or error page?`)
}

const metaPath = join(outDir, 'capture-meta.json')
assert.ok(existsSync(metaPath), `missing ${metaPath}`)
const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as {
  locale?: string
  slugs?: string[] | 'all'
}
assert.equal(meta.locale, 'en-US', 'capture-meta.json locale must be en-US')
assert.ok(
  Array.isArray(meta.slugs) && meta.slugs.includes('chat') && meta.slugs.includes('cockpit'),
  'capture-meta.json slugs must include chat and cockpit'
)

for (const page of THEME_PAGES) {
  const light = readFileSync(join(outDir, `light_${page}.png`))
  const dark = readFileSync(join(outDir, `dark_${page}.png`))
  assert.notEqual(
    createHash('md5').update(light).digest('hex'),
    createHash('md5').update(dark).digest('hex'),
    `light_${page}.png and dark_${page}.png are identical — theme not applied`
  )
}

console.log(`verify:visual-screenshots-en: ok (${EXPECTED.length} png → ${outDir})`)
