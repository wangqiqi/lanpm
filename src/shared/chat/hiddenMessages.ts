const STORAGE_KEY = 'lanpm.hiddenMessages'

type HiddenByGroup = Record<string, string[]>

function readAll(): HiddenByGroup {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as HiddenByGroup
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: HiddenByGroup): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function listHiddenMessageIds(groupId: string): string[] {
  return readAll()[groupId] ?? []
}

export function isMessageHidden(groupId: string, msgId: string): boolean {
  return listHiddenMessageIds(groupId).includes(msgId)
}

export function hideMessageLocally(groupId: string, msgId: string): string[] {
  const all = readAll()
  const prev = all[groupId] ?? []
  if (prev.includes(msgId)) return prev
  const next = [...prev, msgId]
  all[groupId] = next
  writeAll(all)
  return next
}

export function hideMessagesLocally(groupId: string, msgIds: string[]): string[] {
  const all = readAll()
  const prev = new Set(all[groupId] ?? [])
  for (const id of msgIds) prev.add(id)
  const next = [...prev]
  all[groupId] = next
  writeAll(all)
  return next
}

export function unhideMessageLocally(groupId: string, msgId: string): string[] {
  const all = readAll()
  const next = (all[groupId] ?? []).filter((id) => id !== msgId)
  if (next.length === 0) delete all[groupId]
  else all[groupId] = next
  writeAll(all)
  return next
}

export function filterVisibleMessages<T extends { msgId: string }>(
  groupId: string,
  messages: T[],
  hiddenIds?: string[]
): T[] {
  const hidden = new Set(hiddenIds ?? listHiddenMessageIds(groupId))
  if (hidden.size === 0) return messages
  return messages.filter((m) => !hidden.has(m.msgId))
}
