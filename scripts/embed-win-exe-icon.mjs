#!/usr/bin/env node
/**
 * Embed LanPM icon into Windows .exe (taskbar + toast AUMID badge).
 * Used when signAndEditExecutable is false (avoids winCodeSign symlink on local Windows).
 * Run: node scripts/embed-win-exe-icon.mjs [path/to/LanPM.exe ...]
 */
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import rcedit from 'rcedit'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const defaultIco = join(root, 'resources/icon.ico')

function defaultTargets() {
  const names = ['LanPM.exe']
  const dirs = ['dist/win-unpacked', 'dist/win-arm64-unpacked']
  const out = []
  for (const dir of dirs) {
    for (const name of names) {
      const p = join(root, dir, name)
      if (existsSync(p)) out.push(p)
    }
  }
  return out
}

async function embedOne(exePath, icoPath) {
  await rcedit(exePath, {
    icon: icoPath,
    'product-name': 'LanPM',
    'file-description': 'LanPM',
    'version-string': {
      CompanyName: 'LanPM',
      FileDescription: 'LanPM',
      ProductName: 'LanPM',
      LegalCopyright: 'Copyright © LanPM'
    }
  })
  console.log('[embed-win-exe-icon] ok', exePath)
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[embed-win-exe-icon] skip — not win32')
    return
  }

  const icoPath = resolve(defaultIco)
  if (!existsSync(icoPath)) {
    console.error('[embed-win-exe-icon] missing', icoPath, '— run npm run build:icons')
    process.exit(1)
  }

  const args = process.argv.slice(2).map((p) => resolve(p))
  const targets = args.length > 0 ? args.filter((p) => existsSync(p)) : defaultTargets()

  if (targets.length === 0) {
    console.warn('[embed-win-exe-icon] no LanPM.exe found under dist/')
    return
  }

  for (const exe of targets) {
    await embedOne(exe, icoPath)
  }
}

main().catch((err) => {
  console.error('[embed-win-exe-icon] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
