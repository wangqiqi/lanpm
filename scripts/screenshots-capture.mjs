#!/usr/bin/env node
/**
 * Build · verify:visual-screenshots · copy PNGs to docs/screenshots/generated/.
 * Run: npm run screenshots:capture
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const captureDir = process.env.LANPM_VISUAL_CAPTURE_DIR ?? join(root, '.lanpm/visual-screenshots')
const generatedDir = join(root, 'docs/screenshots/generated')
const lightBaselineDir = join(root, 'docs/screenshots/baselines/light')
const darkBaselineDir = join(root, 'docs/screenshots/baselines/dark')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npm', ['run', 'build'])
run('npm', ['run', 'verify:visual-screenshots'])

if (!existsSync(captureDir)) {
  console.error('screenshots:capture: capture dir missing after verify:', captureDir)
  process.exit(1)
}

mkdirSync(generatedDir, { recursive: true })
mkdirSync(lightBaselineDir, { recursive: true })
mkdirSync(darkBaselineDir, { recursive: true })
let count = 0
for (const name of readdirSync(captureDir)) {
  if (!name.endsWith('.png')) continue
  const src = join(captureDir, name)
  copyFileSync(src, join(generatedDir, name))
  if (name.startsWith('light_')) {
    copyFileSync(src, join(lightBaselineDir, name))
  }
  if (name.startsWith('dark_')) {
    copyFileSync(src, join(darkBaselineDir, name))
  }
  count++
}

console.log(`screenshots:capture OK (${count} png → ${generatedDir})`)
