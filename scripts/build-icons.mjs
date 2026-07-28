#!/usr/bin/env node
/**
 * Regenerate raster icons from resources/*.svg (requires ImageMagick `convert`).
 * Usage: node scripts/build-icons.mjs
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'resources')

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root })
}

if (!existsSync(join(res, 'icon.svg'))) {
  console.error('Missing resources/icon.svg')
  process.exit(1)
}

try {
  execSync('convert -version', { stdio: 'pipe' })
} catch {
  console.error('ImageMagick `convert` not found. Install imagemagick or export PNGs manually.')
  process.exit(1)
}

run(`convert -background none "${join(res, 'icon.svg')}" -resize 1024x1024 "${join(res, 'icon.png')}"`)
run(
  `convert "${join(res, 'icon.png')}" -define icon:auto-resize=256,128,64,48,32,16 "${join(res, 'icon.ico')}"`
)
// UI 使用 logo.svg；不生成未引用的 logo-32/64.png（见 无用.md / SPRINT-10）

console.log('Icons written to resources/ (icon.png, icon.ico)')
