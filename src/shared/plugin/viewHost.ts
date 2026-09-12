import type { AppView } from '../navigation/types.ts'
import type { PluginSlotId, PluginView } from './types.ts'

/** 非 AppView zone 的全局 Slot（§3.1 · globalSlotMap SSOT） */
export type GlobalPluginSlotId = Extract<
  PluginSlotId,
  'topbar.menu' | 'group.tab.overflow' | 'profile.tab'
>

export const GLOBAL_PLUGIN_SLOT_IDS: readonly GlobalPluginSlotId[] = [
  'topbar.menu',
  'group.tab.overflow',
  'profile.tab'
] as const

/** 视图内插件挂载区域（§3.5.2） */
export type ViewPluginZone =
  | 'toolbar'
  | 'composer'
  | 'composerHint'
  | 'detail'
  | 'card'
  | 'context'
  | 'preview'

/** 统一插件上下文；群级 Slot 可不传 selection */
export type ViewPluginContext = {
  groupId: string
  /** 核心 AppView 或 Layer C 贡献路由（如 `mindmap`） */
  view: AppView | string
  /** `PluginZoneHost` 注入；插件据此区分同视图多 zone */
  zone?: ViewPluginZone
  selection?: {
    taskId?: string
    fileId?: string
    messageId?: string
  }
  /** Chat composer draft — ops hint expand when typing `/` */
  composerDraft?: string
}

/** PluginSlotHost 契约（§3.5.2） */
export type PluginSlotHostProps = {
  slot: PluginSlotId
  context: ViewPluginContext
}

export type PluginZoneHostProps = {
  zone: ViewPluginZone
  context: ViewPluginContext
}

/** Profile 插件 Tab：可选活动群上下文 */
export type ProfilePluginContext = {
  groupId?: string
  view?: AppView | string
}

export type PluginGlobalSlotProps = {
  slot: GlobalPluginSlotId
  context: ViewPluginContext
}

export type PluginProfileTabProps = {
  plugin: PluginView
  context: ProfilePluginContext
}
