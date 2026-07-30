/** 路由表引导：合并路由前缀 · 网卡 · 种子 → 子网广播地址 */

import { subnetPrefix, listSubnetBroadcastAddresses } from './pairingHostResolve.ts'

export interface RouteGuidedContext {
  routeSubnetPrefixes: string[]
  localLanIps: string[]
  seedHosts: string[]
}

function collectSubnetPrefixes(ctx: RouteGuidedContext): string[] {
  const prefixes = new Set<string>()

  for (const p of ctx.routeSubnetPrefixes) {
    if (p) prefixes.add(p)
  }
  for (const ip of ctx.localLanIps) {
    const p = subnetPrefix(ip)
    if (p) prefixes.add(p)
  }
  for (const raw of ctx.seedHosts) {
    const host = raw.includes(':') ? raw.split(':')[0]! : raw
    const p = subnetPrefix(host)
    if (p) prefixes.add(p)
  }

  return [...prefixes]
}

/** 路由表 + 网卡 + 种子 → 各 /24 广播地址（如 `192.168.20.255`） */
export function listRouteGuidedBroadcastAddresses(ctx: RouteGuidedContext): string[] {
  const fromRoutes = collectSubnetPrefixes(ctx).map((p) => `${p}.255`)
  if (fromRoutes.length > 0) {
    return [...new Set(fromRoutes)]
  }
  return listSubnetBroadcastAddresses(ctx.localLanIps)
}
