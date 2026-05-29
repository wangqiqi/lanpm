import type { MessageKey, TranslateParams } from '@renderer/i18n/messages'
import type { NavGroup } from '@shared/navigation/types'
import { LANPM_DM_GROUP_LABEL } from '@shared/constants/display'
import { isDemoGroupId } from '@renderer/routes/paths'

const DEMO_NAME_KEYS: Record<string, MessageKey> = {
  'demo-project': 'demo.groupProject',
  'demo-function': 'demo.groupFunction',
  'demo-anonymous': 'demo.groupAnonymous'
}

export function resolveGroupDisplayName(
  group: NavGroup,
  t: (key: MessageKey, params?: TranslateParams) => string
): string {
  return resolveGroupDisplayNameById(group.groupId, group.name, t)
}

/** 演示群 / 搜索 / 驾驶舱等：DB 存中文种子名，展示层按 locale 解析 */
export function resolveGroupDisplayNameById(
  groupId: string,
  storedName: string,
  t: (key: MessageKey, params?: TranslateParams) => string
): string {
  if (isDemoGroupId(groupId)) {
    const key = DEMO_NAME_KEYS[groupId]
    if (key) return t(key)
  }
  if (groupId.startsWith('dm:')) {
    if (storedName === LANPM_DM_GROUP_LABEL || storedName === '私聊') {
      return t('search.dmGroup')
    }
    if (storedName.startsWith('私聊 · ')) {
      return t('topbar.dmLabel', { name: storedName.slice('私聊 · '.length) })
    }
    return t('topbar.dmLabel', { name: storedName })
  }
  return storedName
}
