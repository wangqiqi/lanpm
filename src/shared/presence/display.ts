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
