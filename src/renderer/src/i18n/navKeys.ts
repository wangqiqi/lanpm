import type { AppView } from '@shared/navigation/types'
import type { MessageKey } from './types'

export const VIEW_MESSAGE_KEYS: Record<AppView, MessageKey> = {
  chat: 'nav.chat',
  board: 'nav.board',
  tree: 'nav.tree',
  gantt: 'nav.gantt',
  files: 'nav.files'
}
