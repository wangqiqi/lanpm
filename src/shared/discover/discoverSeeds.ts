import { parseHostPort } from '../network/manualPeer.ts'

export const DISCOVER_SEEDS_META_KEY = 'discover_seeds_json'
export const DISCOVER_SEEDS_MAX = 20

/** Normalize / dedupe `host:port` seed list (A5). */
export function normalizeDiscoverSeeds(raw: unknown): string[] {
  const list: string[] = []
  const seen = new Set<string>()
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  for (const item of items) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    try {
      const { host, port } = parseHostPort(trimmed)
      const key = `${host}:${port}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push(key)
      if (list.length >= DISCOVER_SEEDS_MAX) break
    } catch {
      // skip invalid
    }
  }
  return list
}

export function addDiscoverSeed(existing: string[] | undefined, address: string): string[] {
  return normalizeDiscoverSeeds([...(existing ?? []), address])
}

export function removeDiscoverSeed(existing: string[] | undefined, address: string): string[] {
  const target = address.trim()
  return normalizeDiscoverSeeds((existing ?? []).filter((s) => s !== target))
}
