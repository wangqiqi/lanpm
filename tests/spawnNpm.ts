/**
 * Cross-platform npm run — Windows 上 npm 为 .cmd，须 shell: true。
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { projectRoot } from './projectRoot.ts'

export function spawnNpmRun(
  script: string,
  env?: Record<string, string>
): SpawnSyncReturns<Buffer> {
  return spawnSync('npm', ['run', script], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env }
  })
}
