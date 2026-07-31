import type { PluginView } from '@shared/plugin/types'

/** paid 插件须 `licensed === true`；free 始终可用 */
export function isPluginLicenseActive(plugin: PluginView): boolean {
  if (plugin.pricing === 'free') return true
  return plugin.licensed === true
}
