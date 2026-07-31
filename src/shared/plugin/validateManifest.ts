import type { GroupType } from '../navigation/types.ts'
import {
  defaultContributionGroupTypes,
  isReservedContributionRoute,
  type PluginContributionView
} from './contributions.ts'
import type { PluginCommand } from './commands.ts'
import type { PluginMenu, PluginMenuLocation } from './menus.ts'
import { isPluginMenuLocation } from './menus.ts'
import {
  PLUGIN_CAPABILITY_IDS,
  PLUGIN_SLOT_IDS,
  type PluginCapabilityId,
  type PluginManifest,
  type PluginSlotId
} from './types.ts'

const SLOT_SET = new Set<string>(PLUGIN_SLOT_IDS)
const CAP_SET = new Set<string>(PLUGIN_CAPABILITY_IDS)
const GROUP_TYPES = new Set<string>(['project', 'function', 'anonymous'])

function parseContributionViews(raw: unknown): PluginContributionView[] | null {
  if (!raw || typeof raw !== 'object') return []
  const contributions = raw as Record<string, unknown>
  if (contributions.views === undefined) return []
  if (!Array.isArray(contributions.views)) return null
  const views: PluginContributionView[] = []
  const routes = new Set<string>()
  for (const item of contributions.views) {
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.trim()) return null
    if (typeof o.route !== 'string' || !o.route.trim()) return null
    if (typeof o.titleKey !== 'string' || !o.titleKey.trim()) return null
    const route = o.route.trim()
    if (!/^[a-z][a-z0-9-]*$/.test(route)) return null
    if (isReservedContributionRoute(route)) return null
    if (routes.has(route)) return null
    routes.add(route)
    const view: PluginContributionView = {
      id: o.id.trim(),
      route,
      titleKey: o.titleKey.trim()
    }
    if (typeof o.icon === 'string' && o.icon.trim()) {
      view.icon = o.icon.trim()
    }
    if (o.groupTypes !== undefined) {
      if (!Array.isArray(o.groupTypes) || o.groupTypes.length === 0) return null
      const groupTypes: GroupType[] = []
      for (const gt of o.groupTypes) {
        if (typeof gt !== 'string' || !GROUP_TYPES.has(gt)) return null
        groupTypes.push(gt as GroupType)
      }
      view.groupTypes = groupTypes
    }
    if (o.pricing === 'free' || o.pricing === 'paid') {
      view.pricing = o.pricing
    }
    views.push(view)
  }
  return views
}

function parseCommands(raw: unknown): PluginCommand[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return null
  const commands: PluginCommand[] = []
  const ids = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.trim()) return null
    if (typeof o.titleKey !== 'string' || !o.titleKey.trim()) return null
    const id = o.id.trim()
    if (!/^[a-z][a-z0-9.-]{0,63}$/.test(id)) return null
    if (ids.has(id)) return null
    ids.add(id)
    commands.push({ id, titleKey: o.titleKey.trim() })
  }
  return commands
}

function parseMenus(raw: unknown, commandIds: Set<string>): PluginMenu[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return null
  const menus: PluginMenu[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    if (typeof o.location !== 'string' || !isPluginMenuLocation(o.location.trim())) return null
    if (!Array.isArray(o.items) || o.items.length === 0) return null
    const items: PluginMenu['items'] = []
    for (const rawItem of o.items) {
      if (!rawItem || typeof rawItem !== 'object') return null
      const entry = rawItem as Record<string, unknown>
      if (typeof entry.command !== 'string' || !entry.command.trim()) return null
      const command = entry.command.trim()
      if (!/^[a-z][a-z0-9.-]{0,63}$/.test(command)) return null
      if (!commandIds.has(command)) return null
      items.push({ command })
    }
    menus.push({ location: o.location.trim() as PluginMenuLocation, items })
  }
  return menus
}

/**
 * 校验 plugin.json；非法返回 null（发现阶段跳过）。
 */
export function parsePluginManifest(raw: unknown): PluginManifest | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id.trim()) return null
  if (typeof o.name !== 'string' || !o.name.trim()) return null
  if (typeof o.version !== 'string' || !o.version.trim()) return null
  if (o.pricing !== 'free' && o.pricing !== 'paid') return null
  if (!Array.isArray(o.slots)) return null
  if (!Array.isArray(o.capabilities)) return null

  const contributionViews = parseContributionViews(o.contributions)
  if (contributionViews === null) return null
  const commands = parseCommands(o.commands)
  if (commands === null) return null
  const commandIds = new Set(commands.map((cmd) => cmd.id))
  const menus = parseMenus(o.menus, commandIds)
  if (menus === null) return null

  const slots: PluginSlotId[] = []
  for (const s of o.slots) {
    if (typeof s !== 'string' || !SLOT_SET.has(s)) return null
    slots.push(s as PluginSlotId)
  }
  if (slots.length === 0 && contributionViews.length === 0 && commands.length === 0 && menus.length === 0) {
    return null
  }

  const capabilities: PluginCapabilityId[] = []
  for (const c of o.capabilities) {
    if (typeof c !== 'string' || !CAP_SET.has(c)) return null
    capabilities.push(c as PluginCapabilityId)
  }

  const manifest: PluginManifest = {
    id: o.id.trim(),
    name: o.name.trim(),
    version: o.version.trim(),
    slots,
    capabilities,
    pricing: o.pricing
  }
  if (o.engines && typeof o.engines === 'object') {
    const eng = o.engines as Record<string, unknown>
    if (typeof eng.lanpm === 'string') {
      manifest.engines = { lanpm: eng.lanpm }
    }
  }
  if (contributionViews.length > 0) {
    manifest.contributions = { views: contributionViews }
  }
  if (commands.length > 0) {
    manifest.commands = commands
  }
  if (menus.length > 0) {
    manifest.menus = menus
  }
  return manifest
}

export function pluginDeclaresCapability(
  manifest: Pick<PluginManifest, 'capabilities'>,
  capability: PluginCapabilityId
): boolean {
  return manifest.capabilities.includes(capability)
}

export function resolveContributionGroupTypes(view: PluginContributionView): GroupType[] {
  return view.groupTypes?.length ? view.groupTypes : defaultContributionGroupTypes()
}
