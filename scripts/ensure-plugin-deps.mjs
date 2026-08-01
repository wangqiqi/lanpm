/**
 * Ensures optional plugin subpackage deps (mind-elixir) are installed.
 * No-op when already present.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const PLUGIN_PACKAGES = [
  { dir: 'plugins/lanpm.mindmap', marker: 'node_modules/mind-elixir' }
]

for (const { dir, marker } of PLUGIN_PACKAGES) {
  const pkgRoot = join(root, dir)
  if (!existsSync(join(pkgRoot, 'package.json'))) continue
  if (existsSync(join(pkgRoot, marker))) continue
  console.log(`[lanpm] Installing optional plugin deps in ${dir}…`)
  const r = spawnSync('npm', ['install', '--prefix', pkgRoot], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (r.status !== 0) {
    console.warn(`[lanpm] warn: npm install in ${dir} failed — plugin may run in stub mode`)
  }
}
