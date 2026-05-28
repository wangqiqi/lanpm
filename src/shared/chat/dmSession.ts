export const DM_PREFIX = 'dm:'
const DM_SEP = '__'

/** 两用户确定性私聊 groupId（字典序，对齐 docs/03 私聊 P0） */
export function buildDmGroupId(userA: string, userB: string): string {
  if (userA === userB) {
    throw new Error('不能与自己私聊')
  }
  const [a, b] = [userA, userB].sort()
  return `${DM_PREFIX}${a}${DM_SEP}${b}`
}

export function isDmGroupId(groupId: string): boolean {
  return groupId.startsWith(DM_PREFIX)
}

export function parseDmGroupId(groupId: string): [string, string] | null {
  if (!isDmGroupId(groupId)) return null
  const rest = groupId.slice(DM_PREFIX.length)
  const idx = rest.indexOf(DM_SEP)
  if (idx <= 0) return null
  const userA = rest.slice(0, idx)
  const userB = rest.slice(idx + DM_SEP.length)
  if (!userA || !userB) return null
  return [userA, userB]
}

export function getDmPeerUserId(groupId: string, localUserId: string): string | null {
  const pair = parseDmGroupId(groupId)
  if (!pair) return null
  const [a, b] = pair
  if (a === localUserId) return b
  if (b === localUserId) return a
  return null
}

export function formatDmTitle(peerDisplayName: string): string {
  return `私聊 · ${peerDisplayName}`
}
