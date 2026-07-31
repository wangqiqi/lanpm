import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { hostname, platform } from 'node:os'

function readStablePlatformId(): string {
  const p = platform()
  if (p === 'linux') {
    for (const path of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      if (existsSync(path)) {
        return readFileSync(path, 'utf8').trim()
      }
    }
  }
  if (p === 'darwin') {
    try {
      const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf8' })
      const match = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)
      if (match?.[1]) return match[1]
    } catch {
      /* ignore */
    }
  }
  if (p === 'win32') {
    try {
      const out = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf8' }
      )
      const match = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/)
      if (match?.[1]) return match[1]
    } catch {
      /* ignore */
    }
  }
  return `${p}:${hostname()}`
}

/** 与 `lanpm-license collect` 输出一致的机器指纹 */
export function getLocalMachineId(): string {
  const stable = readStablePlatformId()
  return `sha256:${createHash('sha256').update(stable, 'utf8').digest('hex')}`
}
