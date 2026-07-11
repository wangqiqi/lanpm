import { DEFAULT_TCP_LISTEN_PORT } from './constants.ts'

export { DEFAULT_TCP_LISTEN_PORT as DEFAULT_LANPM_TCP_PORT }

/**
 * Parse `LANPM_TCP_PORT` (or similar). Invalid / out-of-range → `fallback`.
 * Accepts only integers in 1..65535.
 */
export function resolveLanpmTcpPort(
  raw: string | undefined | null,
  fallback = DEFAULT_TCP_LISTEN_PORT
): number {
  if (raw == null) return fallback
  const trimmed = String(raw).trim()
  if (trimmed === '') return fallback
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > 65_535) return fallback
  return n
}
