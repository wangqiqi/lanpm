import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { PluginSlotId, PluginView } from '../../shared/plugin/types.ts'
import type { ContributedPluginView } from '../../shared/plugin/contributions.ts'
import {
  parsePluginManifest,
  resolveContributionGroupTypes
} from '../../shared/plugin/validateManifest.ts'
import { isPluginEnabled, readEnabledMap } from './enabledStore.ts'
import { resolvePluginsRoot } from './paths.ts'

export function discoverPlugins(): PluginView[] {
  const root = resolvePluginsRoot()
  if (!existsSync(root)) return []
  const enabledMap = readEnabledMap()
  const views: PluginView[] = []
  for (const dirName of readdirSync(root, { withFileTypes: true })) {
    if (!dirName.isDirectory()) continue
    const manifestPath = join(root, dirName.name, 'plugin.json')
    if (!existsSync(manifestPath)) continue
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      continue
    }
    const manifest = parsePluginManifest(raw)
    if (!manifest) continue
    views.push({
      ...manifest,
      dirName: dirName.name,
      enabled: isPluginEnabled(manifest.id, enabledMap)
    })
  }
  views.sort((a, b) => a.id.localeCompare(b.id))
  return views
}

export function listSlotPlugins(slotId: PluginSlotId): PluginView[] {
  return discoverPlugins().filter((p) => p.enabled && p.slots.includes(slotId))
}

export function findPluginById(pluginId: string): PluginView | null {
  return discoverPlugins().find((p) => p.id === pluginId) ?? null
}

export function listContributedViews(): ContributedPluginView[] {
  const views: ContributedPluginView[] = []
  for (const plugin of discoverPlugins()) {
    if (!plugin.enabled) continue
    for (const view of plugin.contributions?.views ?? []) {
      views.push({
        ...view,
        pluginId: plugin.id,
        dirName: plugin.dirName,
        enabled: plugin.enabled,
        groupTypes: resolveContributionGroupTypes(view),
        pricing: view.pricing ?? plugin.pricing
      })
    }
  }
  views.sort((a, b) => a.route.localeCompare(b.route))
  return views
}

export function findContributedViewByRoute(route: string): ContributedPluginView | null {
  return listContributedViews().find((v) => v.route === route) ?? null
}
