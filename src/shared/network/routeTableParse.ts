/** 路由表文本 → /24 子网前缀（纯函数，供单测与 main 共用） */

import { subnetPrefix } from './pairingHostResolve.ts'

function parseIpv4Cidr(network: string, maskOrBits?: string): string | null {
  const netParts = network.trim().split('.').map(Number)
  if (netParts.length !== 4 || netParts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null
  }

  if (!maskOrBits) {
    return `${netParts[0]}.${netParts[1]}.${netParts[2]}`
  }

  const mask = maskOrBits.trim()
  if (/^\d{1,2}$/.test(mask)) {
    const bits = Number(mask)
    if (bits >= 24) {
      return `${netParts[0]}.${netParts[1]}.${netParts[2]}`
    }
    if (bits >= 16) {
      return `${netParts[0]}.${netParts[1]}`
    }
    return `${netParts[0]}`
  }

  const maskParts = mask.split('.').map(Number)
  if (maskParts.length === 4 && maskParts.every((n) => !Number.isNaN(n))) {
    if (maskParts[0] === 255 && maskParts[1] === 255 && maskParts[2] === 255) {
      return `${netParts[0]}.${netParts[1]}.${netParts[2]}`
    }
    if (maskParts[0] === 255 && maskParts[1] === 255) {
      return `${netParts[0]}.${netParts[1]}`
    }
  }

  return subnetPrefix(network)
}

function isUsefulRoutePrefix(prefix: string): boolean {
  const parts = prefix.split('.').map(Number)
  if (parts.length < 3) return false
  if (parts[0] === 127 || parts[0] === 0) return false
  if (parts[0] === 169 && parts[1] === 254) return false
  if (parts[0] === 224) return false
  return true
}

function addPrefix(out: Set<string>, prefix: string | null): void {
  if (!prefix || !isUsefulRoutePrefix(prefix)) return
  out.add(prefix)
}

/** Windows `route print -4` 输出 */
export function parseWindowsRoutePrint(output: string): string[] {
  const prefixes = new Set<string>()
  const lines = output.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('Active Routes')) continue

    // 0.0.0.0          0.0.0.0      192.168.30.1    192.168.30.170
    const winCols = trimmed.split(/\s+/)
    if (winCols.length >= 4 && /^\d+\.\d+\.\d+\.\d+$/.test(winCols[0]!)) {
      const dest = winCols[0]!
      const mask = winCols[1]!
      if (dest === '0.0.0.0' && mask === '0.0.0.0') continue
      addPrefix(prefixes, parseIpv4Cidr(dest, mask))
      continue
    }

    // On-link 192.168.20.5
    const onLink = trimmed.match(/On-link\s+(\d+\.\d+\.\d+\.\d+)/i)
    if (onLink) {
      addPrefix(prefixes, subnetPrefix(onLink[1]!))
    }
  }

  return [...prefixes]
}

/** Linux `ip -4 route` 输出 */
export function parseLinuxIpRoute(output: string): string[] {
  const prefixes = new Set<string>()

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const cidr = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})\b/)
    if (cidr) {
      addPrefix(prefixes, parseIpv4Cidr(cidr[1]!, cidr[2]!))
      continue
    }

    const plain = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\s/)
    if (plain) {
      addPrefix(prefixes, subnetPrefix(plain[1]!))
    }
  }

  return [...prefixes]
}

/** macOS `netstat -rn -f inet` 输出 */
export function parseMacOsNetstatRn(output: string): string[] {
  const prefixes = new Set<string>()
  let inInternet = false

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (/^Internet:\s*$/i.test(trimmed)) {
      inInternet = true
      continue
    }
    if (/^Internet6:/i.test(trimmed)) {
      inInternet = false
      continue
    }
    if (!inInternet || !trimmed || /^Destination\b/i.test(trimmed)) continue

    const dest = trimmed.split(/\s+/)[0]
    if (!dest || dest === 'default' || dest.startsWith('link#')) continue

    const fullCidr = dest.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/)
    if (fullCidr) {
      addPrefix(prefixes, parseIpv4Cidr(fullCidr[1]!, fullCidr[2]!))
      continue
    }

    const shortCidr = dest.match(/^(\d+\.\d+\.\d+)\/(\d{1,2})$/)
    if (shortCidr) {
      addPrefix(prefixes, parseIpv4Cidr(`${shortCidr[1]}.0`, shortCidr[2]!))
      continue
    }

    const threeOct = dest.match(/^(\d+\.\d+\.\d+)$/)
    if (threeOct) {
      addPrefix(prefixes, threeOct[1]!)
      continue
    }

    const hostRoute = dest.match(/^(\d+\.\d+\.\d+\.\d+)$/)
    if (hostRoute) {
      addPrefix(prefixes, subnetPrefix(hostRoute[1]!))
    }
  }

  return [...prefixes]
}
