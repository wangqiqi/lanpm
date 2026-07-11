const STORAGE_KEY = 'lanpm.badge.lastBoardSeenAt'

type SeenMap = Record<string, string>

function readMap(): SeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as SeenMap
  } catch {
    return {}
  }
}

function writeMap(map: SeenMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getLastBoardSeenAt(groupId: string): string | null {
  if (!groupId) return null
  return readMap()[groupId] ?? null
}

export function markBoardSeen(groupId: string, atIso: string = new Date().toISOString()): void {
  if (!groupId) return
  const map = readMap()
  map[groupId] = atIso
  writeMap(map)
}
