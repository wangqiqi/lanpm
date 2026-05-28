import type { UserPresence } from '@shared/network/types'
import type { MessageKey } from '@renderer/i18n/types'

const PRESENCE_KEYS: Record<UserPresence, MessageKey> = {
  online: 'presence.online',
  away: 'presence.away',
  offline: 'presence.offline'
}

export function presenceMessageKey(presence: UserPresence): MessageKey {
  return PRESENCE_KEYS[presence]
}
