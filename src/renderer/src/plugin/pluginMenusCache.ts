import type { ListedMenuItem } from '@shared/plugin/menus'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'

let cachedMenus: ListedMenuItem[] | null = null
let inflight: Promise<ListedMenuItem[]> | null = null
let listenerAttached = false

function attachInvalidateListener(): void {
  if (listenerAttached || typeof window === 'undefined') return
  listenerAttached = true
  window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, () => {
    invalidatePluginMenusCache()
  })
}

export function invalidatePluginMenusCache(): void {
  cachedMenus = null
  inflight = null
}

export async function fetchPluginMenusCached(): Promise<ListedMenuItem[]> {
  attachInvalidateListener()
  if (cachedMenus) return cachedMenus
  if (!inflight) {
    inflight = getLanpmApi()
      .plugin.listMenus()
      .then((list) => {
        cachedMenus = list
        return list
      })
      .catch(() => {
        cachedMenus = []
        return []
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
