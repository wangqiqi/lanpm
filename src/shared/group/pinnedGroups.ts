/** 本机置顶群 ID（不进同步协议） */
export const PINNED_GROUPS_STORAGE_KEY = 'lanpm.pinnedGroupIds'

export function loadPinnedGroupIds(
  storage: Pick<Storage, 'getItem'> = globalThis.localStorage
): string[] {
  try {
    const raw = storage.getItem(PINNED_GROUPS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

export function savePinnedGroupIds(
  ids: string[],
  storage: Pick<Storage, 'setItem'> = globalThis.localStorage
): void {
  const unique = [...new Set(ids.filter((id) => id.length > 0))]
  storage.setItem(PINNED_GROUPS_STORAGE_KEY, JSON.stringify(unique))
}

/** 切换置顶；返回最新列表 */
export function togglePinnedGroupId(
  groupId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = globalThis.localStorage
): string[] {
  const current = loadPinnedGroupIds(storage)
  const next = current.includes(groupId)
    ? current.filter((id) => id !== groupId)
    : [...current, groupId]
  savePinnedGroupIds(next, storage)
  return next
}
