/** 网络参数 — 对齐 docs/02 §13.5、docs/04 §6.3 */
export const UDP_DISCOVERY_PORT = 43123
export const DEFAULT_TCP_LISTEN_PORT = 43124

export const DISCOVERY_INTERVAL_MS = 3_000
export const HEARTBEAT_INTERVAL_MS = 5_000
export const PEER_TTL_MS = 15_000

/** 指数退避重连（上限 20s） */
export const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 20_000] as const
