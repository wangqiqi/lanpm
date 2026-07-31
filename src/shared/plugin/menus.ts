/** 插件 manifest `menus[]` — 将已声明命令挂到 Host UI 锚点 */

export const PLUGIN_MENU_LOCATIONS = ['topbar.user', 'chat.message.context'] as const

export type PluginMenuLocation = (typeof PLUGIN_MENU_LOCATIONS)[number]

export type PluginMenuItem = {
  /** 同 manifest `commands[].id` */
  command: string
}

export type PluginMenu = {
  location: PluginMenuLocation
  items: PluginMenuItem[]
}

export type ListedMenuItem = {
  location: PluginMenuLocation
  /** 全局唯一：`pluginId:commandId` */
  commandId: string
  titleKey: string
  source: 'plugin'
  pluginId: string
  enabled: boolean
}

const MENU_LOCATION_SET = new Set<string>(PLUGIN_MENU_LOCATIONS)

export function isPluginMenuLocation(value: string): value is PluginMenuLocation {
  return MENU_LOCATION_SET.has(value)
}

/** 将 manifest 内 command 引用扁平化为全局 commandId */
export function resolveMenuCommandId(pluginId: string, commandRef: string): string {
  const trimmed = commandRef.trim()
  if (!trimmed) return ''
  const colon = trimmed.indexOf(':')
  if (colon > 0) {
    return trimmed
  }
  return `${pluginId}:${trimmed}`
}
