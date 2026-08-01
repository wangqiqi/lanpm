import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { PluginSlotId, PluginSource, PluginView } from '../../shared/plugin/types.ts'
import type { ContributedPluginView } from '../../shared/plugin/contributions.ts'
import type { ListedCommand } from '../../shared/plugin/commands.ts'
import type { ListedMenuItem, PluginMenuLocation } from '../../shared/plugin/menus.ts'
import {
  parsePluginManifest,
  resolveContributionGroupTypes
} from '../../shared/plugin/validateManifest.ts'
import { listAllCommands } from './commandRegistry.ts'
import { listAllMenus } from './menuRegistry.ts'
import { isPluginEnabled, readEnabledMap } from './enabledStore.ts'
import { isPluginLicensed } from './licenseStore.ts'
import { resolvePluginsRoot, resolveSideloadPluginsRoot } from './paths.ts'
import { verifyPluginDirectorySignature } from './signatureVerify.ts'

function resolveLicensed(pricing: 'free' | 'paid', pluginId: string): boolean | null {
  if (pricing === 'free') return null
  return isPluginLicensed(pluginId)
}

function scanPluginRoot(root: string, source: PluginSource): PluginView[] {
  if (!existsSync(root)) return []
  const enabledMap = readEnabledMap()
  const views: PluginView[] = []
  for (const dirName of readdirSync(root, { withFileTypes: true })) {
    if (!dirName.isDirectory()) continue
    const pluginDir = join(root, dirName.name)
    const manifestPath = join(pluginDir, 'plugin.json')
    if (!existsSync(manifestPath)) continue
    const signatureValid =
      source === 'builtin' ? true : verifyPluginDirectorySignature(pluginDir)
    if (source === 'sideload' && !signatureValid) continue
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
      source,
      signatureValid,
      licensed: resolveLicensed(manifest.pricing, manifest.id),
      enabled: isPluginEnabled(manifest.id, enabledMap)
    })
  }
  return views
}

export function discoverPlugins(): PluginView[] {
  const byId = new Map<string, PluginView>()
  for (const plugin of scanPluginRoot(resolvePluginsRoot(), 'builtin')) {
    byId.set(plugin.id, plugin)
  }
  for (const plugin of scanPluginRoot(resolveSideloadPluginsRoot(), 'sideload')) {
    byId.set(plugin.id, plugin)
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
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

export function listCommands(): ListedCommand[] {
  return listAllCommands(discoverPlugins())
}

export function listMenus(location?: PluginMenuLocation): ListedMenuItem[] {
  return listAllMenus(discoverPlugins(), location)
}

