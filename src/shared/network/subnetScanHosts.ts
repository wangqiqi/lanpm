/** `/24` 子网主机列表（配对 P2 扫描） */

export const SUBNET_SCAN_MAX_HOSTS = 512
export const SUBNET_SCAN_CONCURRENCY = 32
export const SUBNET_SCAN_HOST_TIMEOUT_MS = 800

/** 从 /24 前缀生成 `.1–.254` 主机列表（去重 · 排除本机 · 总上限） */
export function listSubnetScanHosts(
  prefixes: string[],
  options?: { excludeHosts?: string[]; maxHosts?: number }
): string[] {
  const maxHosts = options?.maxHosts ?? SUBNET_SCAN_MAX_HOSTS
  const exclude = new Set(options?.excludeHosts ?? [])
  const seen = new Set<string>()
  const hosts: string[] = []

  for (const raw of prefixes) {
    const prefix = raw.trim()
    if (!prefix) continue
    for (let last = 1; last <= 254; last++) {
      const host = `${prefix}.${last}`
      if (exclude.has(host) || seen.has(host)) continue
      seen.add(host)
      hosts.push(host)
      if (hosts.length >= maxHosts) return hosts
    }
  }

  return hosts
}
