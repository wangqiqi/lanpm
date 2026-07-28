import type { UserPresence } from '../network/types'

export function presenceEmoji(presence: UserPresence): string {
  switch (presence) {
    case 'online':
      return '🟢'
    case 'away':
      return '🟡'
    case 'offline':
      return '⚪'
  }
}

/** 中文 presence 文案；UI 用 emoji + i18n，本函数仅供 `verify:presence` 与单测。 */
export function presenceLabel(presence: UserPresence): string {
  switch (presence) {
    case 'online':
      return '在线'
    case 'away':
      return '离开'
    case 'offline':
      return '离线'
  }
}
