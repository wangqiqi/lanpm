/**
 * Plugin system SPIKE stubs（SPIKE-276–278）— 类型契约，无运行时加载。
 * 下一 Sprint loader 实现须对齐本文件；禁止插件直连 ipcMain。
 */

/** 插件声明的 UI 槽（Host 注册表键） */
export type PluginSlotId =
  | 'task.detail.section'
  | 'topbar.menu'
  | 'profile.tab'
  | 'group.tab.overflow'
  | 'files.preview.action'

/** Host 可代理给插件的只读能力（白名单；非完整 LanpmApi） */
export type PluginCapabilityId =
  | 'task.list'
  | 'task.get'
  | 'group.get'
  | 'file.listMeta'

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
