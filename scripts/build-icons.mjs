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
for (const size of [32, 64]) {
  run(`convert -background none "${join(res, 'logo.svg')}" -resize ${size}x${size} "${join(res, `logo-${size}.png`)}"`)
}

console.log('Icons written to resources/')
