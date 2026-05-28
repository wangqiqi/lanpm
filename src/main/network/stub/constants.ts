import { join } from 'path'
import { tmpdir } from 'os'

/** docs/04 §6.3 — offline timeout for peer records */
export const STUB_PEER_TTL_MS = 15_000

/** docs/04 §6.3 — discovery refresh interval */
export const STUB_DISCOVERY_INTERVAL_MS = 3_000

/** docs/04 §6.3 — heartbeat interval */
export const STUB_HEARTBEAT_INTERVAL_MS = 5_000

/** Stub bus directory (shared across instances on same host) */
export const STUB_BUS_DIR = join(tmpdir(), 'lanpm-stub')

export const STUB_PEERS_DIR = join(STUB_BUS_DIR, 'peers')
export const STUB_BUS_FILE = join(STUB_BUS_DIR, 'bus.jsonl')

/** Placeholder listen port until M6 WebRTC */
export const STUB_LISTEN_PORT = 43123
