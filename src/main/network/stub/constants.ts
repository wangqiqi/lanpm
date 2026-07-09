import { mkdirSync } from 'fs'
import { join } from 'path'

/** docs/04 §6.3 — offline timeout for peer records */
export const STUB_PEER_TTL_MS = 15_000

/** docs/04 §6.3 — discovery refresh interval */
export const STUB_DISCOVERY_INTERVAL_MS = 3_000

/** docs/04 §6.3 — heartbeat interval */
export const STUB_HEARTBEAT_INTERVAL_MS = 5_000

/**
 * Stub 总线目录（同机多实例共享）。
 * 默认仓库内 `.lanpm/stub-bus`（gitignore），避免堆满 `/tmp`；
 * 可用 `LANPM_STUB_BUS_DIR` 覆盖。
 */
function resolveStubBusDir(): string {
  const fromEnv = process.env.LANPM_STUB_BUS_DIR?.trim()
  if (fromEnv) return fromEnv
  const dir = join(process.cwd(), '.lanpm', 'stub-bus')
  mkdirSync(dir, { recursive: true })
  return dir
}

export const STUB_BUS_DIR = resolveStubBusDir()

export const STUB_PEERS_DIR = join(STUB_BUS_DIR, 'peers')
export const STUB_BUS_FILE = join(STUB_BUS_DIR, 'bus.jsonl')

/** bus.jsonl 超过此大小时截断保留尾部（DATA-STUB-BUS） */
export const STUB_BUS_MAX_BYTES = 8 * 1024 * 1024

/** Placeholder listen port until M6 WebRTC */
export const STUB_LISTEN_PORT = 43123
