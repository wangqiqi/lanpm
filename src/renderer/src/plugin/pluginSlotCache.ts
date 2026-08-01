import type { PluginSlotId, PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'

const slotCache = new Map<PluginSlotId, PluginView[]>()
const inflight = new Map<PluginSlotId, Promise<PluginView[]>>()
let listenerAttached = false

function attachInvalidateListener(): void {
  if (listenerAttached || typeof window === 'undefined') return
  listenerAttached = true
  window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, () => {
    invalidatePluginSlotCache()
  })
}

export function invalidatePluginSlotCache(): void {
  slotCache.clear()
  inflight.clear()
}

export async function fetchSlotPluginsCached(slot: PluginSlotId): Promise<PluginView[]> {
  attachInvalidateListener()
  const hit = slotCache.get(slot)
  if (hit) return hit
  const pending = inflight.get(slot)
  if (pending) return pending
  const promise = getLanpmApi()
    .plugin.listSlotPlugins(slot)
    .then((list) => {
      slotCache.set(slot, list)
      return list
    })
    .catch(() => {
      slotCache.set(slot, [])
      return []
    })
    .finally(() => {
      inflight.delete(slot)
    })
  inflight.set(slot, promise)
  return promise
}
