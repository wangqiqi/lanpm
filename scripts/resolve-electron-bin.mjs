/**
 * Resolve the installed Electron binary (darwin .app bundle, linux binary, win .exe).
 * Uses electron's path.txt — do not hardcode dist/electron (wrong on macOS).
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export function resolveElectronBin() {
  try {
    const require = createRequire(join(root, 'package.json'))
    const bin = require('electron')
    return typeof bin === 'string' && existsSync(bin) ? bin : null
  } catch {
    return null
  }
}
