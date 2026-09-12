import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, writeSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const LOCK_DIR = join(homedir(), '.cache', 'LanPM')
const LOCK_FILE = join(LOCK_DIR, 'instance.pid')

function isPidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readLockPid(): number | null {
  if (!existsSync(LOCK_FILE)) return null
  const raw = readFileSync(LOCK_FILE, 'utf8').trim()
  const pid = Number(raw)
  return Number.isFinite(pid) ? pid : null
}

/** 与 userData 无关：同一登录用户下只允许一个 LanPM（除非 LANPM_ALLOW_MULTI_INSTANCE=1）。 */
export function acquireMachineSingletonLock(): boolean {
  mkdirSync(LOCK_DIR, { recursive: true })
  const existing = readLockPid()
  if (existing !== null && existing !== process.pid && isPidAlive(existing)) {
    return false
  }
  if (existing !== null && !isPidAlive(existing)) {
    try {
      unlinkSync(LOCK_FILE)
    } catch {
      /* ignore */
    }
  }
  try {
    const fd = openSync(LOCK_FILE, 'wx')
    writeSync(fd, String(process.pid))
    closeSync(fd)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EEXIST') {
      const holder = readLockPid()
      if (holder !== null && holder !== process.pid && isPidAlive(holder)) return false
      try {
        unlinkSync(LOCK_FILE)
      } catch {
        return false
      }
      return acquireMachineSingletonLock()
    }
    throw err
  }
}

export function releaseMachineSingletonLock(): void {
  const existing = readLockPid()
  if (existing !== process.pid) return
  try {
    unlinkSync(LOCK_FILE)
  } catch {
    /* ignore */
  }
}

export function registerMachineSingletonReleaseOnExit(): void {
  process.on('exit', () => releaseMachineSingletonLock())
}
