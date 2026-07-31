import type { AppView } from '../navigation/types.ts'
import type { PluginSlotId } from './types.ts'

/** 视图内插件挂载区域（§3.5.2） */
export type ViewPluginZone =
  | 'toolbar'
  | 'composer'
  | 'detail'
  | 'card'
  | 'context'
  | 'preview'

/** 统一插件上下文；群级 Slot 可不传 selection */
export type ViewPluginContext = {
  groupId: string
  view: AppView
  selection?: {
    taskId?: string
    fileId?: string
    messageId?: string
  }
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
