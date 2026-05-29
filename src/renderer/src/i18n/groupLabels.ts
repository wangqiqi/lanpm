import type { MessageKey } from '@renderer/i18n/messages'
import type { NavGroup } from '@shared/navigation/types'
import { isDemoGroupId } from '@renderer/routes/paths'

const DEMO_NAME_KEYS: Record<string, MessageKey> = {
  'demo-project': 'demo.groupProject',
  'demo-function': 'demo.groupFunction',
  'demo-anonymous': 'demo.groupAnonymous'
}

export function resolveGroupDisplayName(
  group: NavGroup,
  t: (key: MessageKey) => string
): string {
  if (isDemoGroupId(group.groupId)) {
    const key = DEMO_NAME_KEYS[group.groupId]
    if (key) return t(key)
  }
  return group.name
}
