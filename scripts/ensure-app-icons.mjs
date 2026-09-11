#!/usr/bin/env node
/**
 * Ensure taskbar / exe / notification raster icons exist (generated from icon.svg).
 * No-op when icon.png + icon.ico are present; otherwise runs build-icons.mjs.
 * Also mirrors icons into .lanpm/artifact/out/resources for packaged main resolution.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot, viteOutResources } from './lanpm-artifact-paths.mjs'

const root = repoRoot(join(dirname(fileURLToPath(import.meta.url))))
const png = join(root, 'resources/icon.png')
const ico = join(root, 'resources/icon.ico')

if (!existsSync(png) || !existsSync(ico)) {
  const r = spawnSync(process.execPath, [join(root, 'scripts/build-icons.mjs')], {
    stdio: 'inherit',
    cwd: root
  })
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1)
}

const outRes = viteOutResources(root)
mkdirSync(outRes, { recursive: true })
for (const name of ['icon.png', 'icon.ico']) {
  copyFileSync(join(root, 'resources', name), join(outRes, name))
}
