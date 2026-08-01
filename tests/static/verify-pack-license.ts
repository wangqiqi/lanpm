/**
 * 打包/构建产物须强制付费插件许可证闸 — 禁止仅靠 `!app.isPackaged` 绕过。
 * Run: npm run verify:pack-license
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:pack-license'], 'missing verify:pack-license script')

const store = readFileSync(join(root, 'src/main/plugin/licenseStore.ts'), 'utf8')
assert.doesNotMatch(
  store,
  /isDevUnpackagedApp/,
  'licenseStore must not bypass via isDevUnpackagedApp / !app.isPackaged'
)
assert.doesNotMatch(
  store,
  /!app\.isPackaged/,
  'licenseStore must not gate license on app.isPackaged'
)
assert.match(store, /shouldBypassPaidPluginLicense/, 'licenseStore must use env-based dev bypass only')

const bypass = readFileSync(join(root, 'src/shared/plugin/licenseDevBypass.ts'), 'utf8')
assert.match(bypass, /shouldBypassPaidPluginLicense/, 'licenseDevBypass export present')

const devRun = readFileSync(join(root, 'scripts/dev-run.mjs'), 'utf8')
assert.match(devRun, /LANPM_LICENSE_SKIP_VERIFY/, 'dev-run must set LANPM_LICENSE_SKIP_VERIFY for npm run dev')

const distScripts = ['dist', 'dist:win', 'dist:linux', 'dist:mac'] as const
for (const key of distScripts) {
  const cmd = pkg.scripts?.[key] ?? ''
  assert.doesNotMatch(
    cmd,
    /LANPM_LICENSE_SKIP_VERIFY/,
    `${key} must not inject LANPM_LICENSE_SKIP_VERIFY`
  )
}

const prebuild = pkg.scripts?.prebuild ?? ''
assert.match(prebuild, /verify:pack-license/, 'prebuild must run verify:pack-license')

console.log('verify:pack-license OK')
