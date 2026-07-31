import type { PluginContributionView } from './contributions.ts'

/**
 * Plugin system SPIKE stubs（SPIKE-276–278）+ loader runtime views（TASK-289+）。
 * 禁止插件直连 ipcMain / SQLite。
 */

/** 插件声明的 UI 槽（Host 注册表键） */
export type PluginSlotId =
  | 'task.detail.section'
  | 'topbar.menu'
  | 'profile.tab'
  | 'group.tab.overflow'
  | 'chat.toolbar.media'
  | 'chat.composer.action'
  | 'chat.message.action'
  | 'board.toolbar'
  | 'board.card.footer'
  | 'tree.toolbar'
  | 'gantt.toolbar'
  | 'gantt.bar.context'
  | 'calendar.toolbar'
  | 'calendar.event.action'
  | 'whiteboard.toolbar'
  | 'files.toolbar'
  | 'files.preview.action'
  | 'mindmap.toolbar'

/** Host 可代理给插件的只读能力（白名单；非完整 LanpmApi） */
export type PluginCapabilityId =
  | 'task.list'
  | 'task.get'
  | 'group.get'
  | 'file.listMeta'
  | 'media.signal.send'
  | 'media.signal.poll'
  | 'media.captureDesktop'
  | 'media.room.state'
  | 'media.livekit.createToken'
  | 'chat.listMessages'
  | 'task.getChecklist'
  | 'member.list'
  | 'chat.sendTaskRef'

export type PluginManifest = {
  /** 稳定 id，如 `lanpm.formjs` */
  id: string
  name: string
  version: string
  /** semver 范围，相对宿主 package.json version */
  engines?: { lanpm?: string }
  slots: PluginSlotId[]
  capabilities: PluginCapabilityId[]
  /** 收费标记：与飞鸽 §7.0 对齐；Host 不据此收费，仅展示 */
  pricing: 'free' | 'paid'
  /** Layer C：整页 Tab 贡献（§3.6） */
  contributions?: {
    views?: PluginContributionView[]
  }
}

/** Renderer / IPC 可见视图 */
export type PluginView = PluginManifest & {
  enabled: boolean
  /** 插件目录相对名（如 lanpm.example） */
  dirName: string
}

/** 安全红线（文档/verify 对照用常量） */
export const PLUGIN_SECURITY_RULES = [
  'no-renderer-node-integration',
  'no-plugin-ipcMain',
  'no-direct-sqlite',
  'capabilities-via-host-only',
  'no-unsigned-remote-code'
] as const

export type PluginSecurityRule = (typeof PLUGIN_SECURITY_RULES)[number]

export const PLUGIN_SLOT_IDS: readonly PluginSlotId[] = [
  'task.detail.section',
  'topbar.menu',
  'profile.tab',
  'group.tab.overflow',
  'chat.toolbar.media',
  'chat.composer.action',
  'chat.message.action',
  'board.toolbar',
  'board.card.footer',
  'tree.toolbar',
  'gantt.toolbar',
  'gantt.bar.context',
  'calendar.toolbar',
  'calendar.event.action',
  'whiteboard.toolbar',
  'files.toolbar',
  'files.preview.action',
  'mindmap.toolbar'
] as const

export const PLUGIN_CAPABILITY_IDS: readonly PluginCapabilityId[] = [
  'task.list',
  'task.get',
  'group.get',
  'file.listMeta',
  'media.signal.send',
  'media.signal.poll',
  'media.captureDesktop',
  'media.room.state',
  'media.livekit.createToken',
  'chat.listMessages',
  'task.getChecklist',
  'member.list',
  'chat.sendTaskRef'
] as const
