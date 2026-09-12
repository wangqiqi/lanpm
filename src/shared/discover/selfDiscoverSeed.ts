import { parseHostPort } from '../network/manualPeer.ts'

/** Strip IPv4-mapped IPv6 so `::ffff:192.168.1.1` matches LAN candidates. */
export function normalizeDiscoverHost(host: string): string {
  const h = host.trim().toLowerCase()
  if (h.startsWith('::ffff:')) return h.slice(7)
  return h
}

function isLoopbackOrWildcard(host: string): boolean {
  return (
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host === '::'
  )
}

/** True when `host:port` is this process's TCP listen (must not seed-connect to self). */
export function isSelfDiscoverSeed(
  address: string,
  localHosts: readonly string[],
  listenPort: number
): boolean {
  try {
    const { host, port } = parseHostPort(address)
    if (port !== listenPort) return false
    const normalized = normalizeDiscoverHost(host)
    if (isLoopbackOrWildcard(normalized)) return true
    const locals = new Set(localHosts.map(normalizeDiscoverHost))
    return locals.has(normalized)
  } catch {
    return false
  }
}

export function pruneSelfDiscoverSeeds(
  seeds: string[],
  localHosts: readonly string[],
  listenPort: number
): string[] {
  return seeds.filter((address) => !isSelfDiscoverSeed(address, localHosts, listenPort))
}
