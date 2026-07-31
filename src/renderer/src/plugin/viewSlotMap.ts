import type { AppView } from '@shared/navigation/types'
import type { PluginSlotId } from '@shared/plugin/types'
import type { GlobalPluginSlotId, ViewPluginZone } from '@shared/plugin/viewHost'

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

/** Layer C 贡献视图 → zone → slotIds */
export const CONTRIBUTED_VIEW_SLOT_MAP: Record<
  string,
  Partial<Record<ViewPluginZone, readonly PluginSlotId[]>>
> = {
  mindmap: {
    toolbar: ['mindmap.toolbar']
  }
}

export function getViewZoneSlots(
  view: AppView | string,
  zone: ViewPluginZone
): readonly PluginSlotId[] {
  if (view in VIEW_SLOT_MAP) {
    return VIEW_SLOT_MAP[view as AppView]?.[zone] ?? []
  }
  return CONTRIBUTED_VIEW_SLOT_MAP[view]?.[zone] ?? []
}

/** 全局 Slot → 宿主文件（verify:view-slot-hosts） */
export const GLOBAL_SLOT_HOST_FILES: Record<GlobalPluginSlotId, string> = {
  'topbar.menu': 'src/renderer/src/layout/TopBar.tsx',
  'group.tab.overflow': 'src/renderer/src/layout/BottomNav.tsx',
  'profile.tab': 'src/renderer/src/features/profile/ProfileModal.tsx'
}

export function isGlobalPluginSlot(slot: PluginSlotId): slot is GlobalPluginSlotId {
  return slot === 'topbar.menu' || slot === 'group.tab.overflow' || slot === 'profile.tab'
}
