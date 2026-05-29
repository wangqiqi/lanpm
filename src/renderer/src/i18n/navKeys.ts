import type { AppView, GroupType } from '@shared/navigation/types'
import type { MessageKey } from './types'

export const NAV_DISABLED_HINT_KEYS: Record<GroupType, MessageKey> = {
  project: 'nav.disabled.project',
  function: 'nav.disabled.function',
  anonymous: 'nav.disabled.anonymous'
}

export const VIEW_MESSAGE_KEYS: Record<AppView, MessageKey> = {
  chat: 'nav.chat',
  board: 'nav.board',
  tree: 'nav.tree',
  gantt: 'nav.gantt',
  files: 'nav.files'
}
