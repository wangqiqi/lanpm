import { isAnonymousGroupType } from '../../shared/group/guards'
import type { GroupType } from '../../shared/navigation/types'

export function groupAllowsMindmapCrdt(groupId: string, type: GroupType): boolean {
  if (groupId.startsWith('dm:')) return false
  if (isAnonymousGroupType(type) || type === 'function') return false
  return true
}
