import type { DiscoverableGroupAdvert } from '../../shared/discover/types'

let provider: (() => DiscoverableGroupAdvert[]) | null = null

export function setDiscoverableGroupsProvider(fn: () => DiscoverableGroupAdvert[]): void {
  provider = fn
}

export function getDiscoverableGroupsForAdvert(): DiscoverableGroupAdvert[] {
  return provider?.() ?? []
}
