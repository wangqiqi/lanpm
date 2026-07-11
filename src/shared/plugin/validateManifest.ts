import {
  PLUGIN_CAPABILITY_IDS,
  PLUGIN_SLOT_IDS,
  type PluginCapabilityId,
  type PluginManifest,
  type PluginSlotId
} from './types.ts'

const SLOT_SET = new Set<string>(PLUGIN_SLOT_IDS)
const CAP_SET = new Set<string>(PLUGIN_CAPABILITY_IDS)

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
  if (!Array.isArray(o.slots) || o.slots.length === 0) return null
  if (!Array.isArray(o.capabilities)) return null
  const slots: PluginSlotId[] = []
  for (const s of o.slots) {
    if (typeof s !== 'string' || !SLOT_SET.has(s)) return null
    slots.push(s as PluginSlotId)
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
  return manifest
}

export function pluginDeclaresCapability(
  manifest: Pick<PluginManifest, 'capabilities'>,
  capability: PluginCapabilityId
): boolean {
  return manifest.capabilities.includes(capability)
}
