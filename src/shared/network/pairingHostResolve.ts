/** 跨网段配对：IP / 尾段 → 候选主机列表（纯函数，无 Node 依赖） */

function parseIpv4(ip: string): number[] | null {
  const parts = ip.trim().split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null
  return parts
}

export function isFullIpv4(input: string): boolean {
  return parseIpv4(input) !== null
}

/** 1–3 位数字尾段，如 `109` */
export function isHostTailSegment(input: string): boolean {
  const trimmed = input.trim()
  if (!/^\d{1,3}$/.test(trimmed)) return false
  const n = Number(trimmed)
  return n >= 0 && n <= 255
}

export function subnetPrefix(ip: string): string | null {
  const parts = parseIpv4(ip)
  if (!parts) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export function hostTail(ip: string): string | null {
  const parts = parseIpv4(ip)
  if (!parts) return null
  return String(parts[3])
}

export interface PairingHostContext {
  localLanIps: string[]
  seedHosts: string[]
}

/** 从本机网卡 IP 推导各 /24 子网广播地址 */
export function listSubnetBroadcastAddresses(localLanIps: string[]): string[] {
  const out = new Set<string>()
  for (const ip of localLanIps) {
    const prefix = subnetPrefix(ip)
    if (prefix) out.add(`${prefix}.255`)
  }
  return [...out]
}

/**
 * 将用户输入解析为待尝试的主机列表。
 * - 完整 IPv4 → 单项
 * - 尾段 `109` → 各已知子网前缀 + 尾段（本机网卡 + 种子）
 * - 其它 → 原样单项
 */
export function buildPairingHostCandidates(
  unicastHost: string,
  ctx: PairingHostContext
): string[] {
  const trimmed = unicastHost.trim()
  if (!trimmed) return []

  if (isFullIpv4(trimmed)) {
    return [trimmed]
  }

  if (isHostTailSegment(trimmed)) {
    const prefixes = new Set<string>()
    for (const ip of ctx.localLanIps) {
      const p = subnetPrefix(ip)
      if (p) prefixes.add(p)
    }
    for (const raw of ctx.seedHosts) {
      const host = raw.includes(':') ? raw.split(':')[0]! : raw
      const p = subnetPrefix(host)
      if (p) prefixes.add(p)
    }
    return [...prefixes].map((p) => `${p}.${trimmed}`)
  }

  return [trimmed]
}
