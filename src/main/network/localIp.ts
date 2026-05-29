import { networkInterfaces } from 'node:os'

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null
  return parts
}

/** RFC1918 私有 IPv4 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = parseIpv4(ip)
  if (!parts) return false
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  return false
}

/** 不适合作为局域网协作地址的 IPv4（链路本地 / VPN 假 IP 等） */
export function isExcludedLanIp(ip: string): boolean {
  const parts = parseIpv4(ip)
  if (!parts) return true
  if (parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  // Clash / Meta 等 TUN 常用 fake-ip 段
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true
  return false
}

/** 虚拟 / 隧道 / 容器网卡名（Windows 中文名亦覆盖） */
export function isVirtualInterfaceName(name: string): boolean {
  const n = name.toLowerCase()
  return (
    /vmware|vmnet|virtualbox|vboxnet|hyper-v|vethernet|wsl|docker|veth|tun|tap|meta|clash|sing-box|tailscale|zerotier|npcap|loopback|bluetooth|蓝牙|npcap/.test(
      n
    ) || n.includes('virtual')
  )
}

/** 常见真实局域网网卡名 */
export function isPhysicalLanInterfaceName(name: string): boolean {
  const n = name.toLowerCase()
  if (isVirtualInterfaceName(name)) return false
  return /wlan|wi-?fi|wireless|802\.11|ethernet|以太网|^eth\d|^en\d/i.test(n)
}

export function scoreLanCandidate(name: string, address: string): number {
  if (isExcludedLanIp(address)) return -1000
  let score = 0
  if (isPrivateIpv4(address)) score += 50
  else return -500

  if (isPhysicalLanInterfaceName(name)) score += 80
  if (isVirtualInterfaceName(name)) score -= 200
  // 192.168.0.0/16 常见于 Wi‑Fi/家庭路由
  if (address.startsWith('192.168.')) score += 10
  return score
}

export interface LanCandidate {
  name: string
  address: string
  score: number
}

export function listLanCandidates(): LanCandidate[] {
  const out: LanCandidate[] = []
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (!addrs) continue
    for (const net of addrs) {
      const family = net.family as string | number
      if (family !== 'IPv4' && family !== 4) continue
      if (net.internal) continue
      out.push({ name, address: net.address, score: scoreLanCandidate(name, net.address) })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

/** 本机局域网 IPv4 — 优先 Wi‑Fi/以太网，排除 VMware/VPN 等虚拟网卡 */
export function getLocalLanIp(): string | null {
  const ranked = listLanCandidates().filter((c) => c.score > 0)
  if (ranked.length > 0) return ranked[0].address

  const fallback = listLanCandidates().filter((c) => isPrivateIpv4(c.address) && !isExcludedLanIp(c.address))
  return fallback[0]?.address ?? null
}

/** UDP 发现：优先对端自报的局域网 IP，其次包源地址 */
export function resolvePeerHost(advertisedHost?: string, sourceHost?: string): string {
  const adv = advertisedHost?.trim()
  const src = sourceHost?.trim()
  const usable = (ip?: string) => !!ip && isPrivateIpv4(ip) && !isExcludedLanIp(ip)

  if (usable(adv) && !usable(src)) return adv!
  if (usable(src) && !usable(adv)) return src!
  if (usable(adv) && usable(src)) return adv!
  return adv ?? src ?? '127.0.0.1'
}
