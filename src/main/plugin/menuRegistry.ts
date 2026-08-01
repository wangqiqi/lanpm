import type { ListedMenuItem, PluginMenuLocation } from '../../shared/plugin/menus.ts'
import { resolveMenuCommandId } from '../../shared/plugin/menus.ts'

type DiscoverPlugin = {
  id: string
  enabled: boolean
  commands?: Array<{ id: string; titleKey: string }>
  menus?: Array<{
    location: PluginMenuLocation
    items: Array<{ command: string }>
  }>
}

export function listPluginMenusFromDiscover(plugins: DiscoverPlugin[]): ListedMenuItem[] {
  const listed: ListedMenuItem[] = []
  for (const plugin of plugins) {
    if (!plugin.enabled) continue
    const titleByCommandId = new Map(
      (plugin.commands ?? []).map((cmd) => [cmd.id, cmd.titleKey] as const)
    )
    for (const menu of plugin.menus ?? []) {
      for (const item of menu.items) {
        const localId = item.command.trim()
        const titleKey = titleByCommandId.get(localId)
        if (!titleKey) continue
        listed.push({
          location: menu.location,
          commandId: resolveMenuCommandId(plugin.id, localId),
          titleKey,
          source: 'plugin',
          pluginId: plugin.id,
          enabled: true
        })
      }
    }
  }
  listed.sort((a, b) => {
    const loc = a.location.localeCompare(b.location)
    if (loc !== 0) return loc
    return a.commandId.localeCompare(b.commandId)
  })
  return listed
}

export function listAllMenus(
  plugins: DiscoverPlugin[],
  location?: PluginMenuLocation
): ListedMenuItem[] {
  const all = listPluginMenusFromDiscover(plugins)
  if (!location) return all
  return all.filter((item) => item.location === location)
}
