import type { DiscoverableGroupAdvert } from '../../shared/discover/types'

interface CachedGroup {
  advert: DiscoverableGroupAdvert
  ownerUserId: string
  ownerDisplayName: string
  updatedAt: number
}

const cache = new Map<string, CachedGroup>()
const TTL_MS = 60_000

export function rememberPeerGroups(
  ownerUserId: string,
  ownerDisplayName: string,
  groups: DiscoverableGroupAdvert[] | undefined
): void {
  if (!groups?.length) return
  const now = Date.now()
  for (const advert of groups) {
    if (!advert.groupId || !advert.name) continue
    cache.set(advert.groupId, {
      advert,
      ownerUserId,
      ownerDisplayName,
      updatedAt: now
    })
  }
}

export function listCachedDiscoverGroups(): CachedGroup[] {
  const now = Date.now()
  for (const [id, entry] of cache) {
    if (now - entry.updatedAt > TTL_MS) cache.delete(id)
  }
  return [...cache.values()]
}

export function getCachedGroup(groupId: string): CachedGroup | undefined {
  const entry = cache.get(groupId)
  if (!entry) return undefined
  if (Date.now() - entry.updatedAt > TTL_MS) {
    cache.delete(groupId)
    return undefined
  }
  return entry
}
