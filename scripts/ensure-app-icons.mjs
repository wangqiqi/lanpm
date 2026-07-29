#!/usr/bin/env node
/**
 * Ensure taskbar / exe / notification raster icons exist (generated from icon.svg).
 * No-op when icon.png + icon.ico are present; otherwise runs build-icons.mjs.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const png = join(root, 'resources/icon.png')
const ico = join(root, 'resources/icon.ico')

if (existsSync(png) && existsSync(ico)) {
  process.exit(0)
}

const r = spawnSync(process.execPath, [join(root, 'scripts/build-icons.mjs')], {
  stdio: 'inherit',
  cwd: root
})
process.exit(r.status ?? 1)
