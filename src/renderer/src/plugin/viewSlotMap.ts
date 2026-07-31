import type { AppView } from '@shared/navigation/types'
import type { PluginSlotId } from '@shared/plugin/types'
import type { ViewPluginZone } from '@shared/plugin/viewHost'

/** AppView → zone → slotIds（§3.5.3 SSOT） */
export const VIEW_SLOT_MAP: Record<
  AppView,
  Partial<Record<ViewPluginZone, readonly PluginSlotId[]>>
> = {
  chat: {
    toolbar: ['chat.toolbar.media'],
    composer: ['chat.composer.action'],
    context: ['chat.message.action']
  },
  board: {
    toolbar: ['board.toolbar'],
    card: ['board.card.footer'],
    detail: ['task.detail.section']
  },
  tree: {
    toolbar: ['tree.toolbar'],
    detail: ['task.detail.section']
  },
  gantt: {
    toolbar: ['gantt.toolbar'],
    context: ['gantt.bar.context']
  },
  calendar: {
    toolbar: ['calendar.toolbar'],
    context: ['calendar.event.action']
  },
  whiteboard: {
    toolbar: ['whiteboard.toolbar']
  },
  files: {
    toolbar: ['files.toolbar'],
    preview: ['files.preview.action']
  }
}

export function getViewZoneSlots(view: AppView, zone: ViewPluginZone): readonly PluginSlotId[] {
  return VIEW_SLOT_MAP[view]?.[zone] ?? []
}
