import type { ListedMenuItem, PluginMenuLocation } from '@shared/plugin/menus'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'

const cacheByKey = new Map<string, ListedMenuItem[]>()
const inflightByKey = new Map<string, Promise<ListedMenuItem[]>>()
let listenerAttached = false

function cacheKey(location?: PluginMenuLocation): string {
  return location ?? '__all__'
}

function attachInvalidateListener(): void {
  if (listenerAttached || typeof window === 'undefined') return
  listenerAttached = true
  window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, () => {
    invalidatePluginMenusCache()
  })
}

export function invalidatePluginMenusCache(): void {
  cacheByKey.clear()
  inflightByKey.clear()
}

export async function fetchPluginMenusCached(
  location?: PluginMenuLocation
): Promise<ListedMenuItem[]> {
  attachInvalidateListener()
  const key = cacheKey(location)
  const cached = cacheByKey.get(key)
  if (cached) return cached

  let inflight = inflightByKey.get(key)
  if (!inflight) {
    inflight = getLanpmApi()
      .plugin.listMenus(location)
      .then((list) => {
        cacheByKey.set(key, list)
        return list
      })
      .catch(() => {
        cacheByKey.set(key, [])
        return []
      })
      .finally(() => {
        inflightByKey.delete(key)
      })
    inflightByKey.set(key, inflight)
  }
  return inflight
}
