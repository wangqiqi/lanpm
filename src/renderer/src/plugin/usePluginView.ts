import { useEffect, useState } from 'react'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { PLUGIN_ENABLED_CHANGED_EVENT } from './pluginEvents'

export function usePluginView(pluginId: string | null): PluginView | null {
  const [plugin, setPlugin] = useState<PluginView | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onChanged = (): void => setReloadToken((n) => n + 1)
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    if (!pluginId) {
      setPlugin(null)
      return
    }
    let cancelled = false
    void getLanpmApi()
      .plugin.listPlugins()
      .then((list) => {
        if (!cancelled) setPlugin(list.find((p) => p.id === pluginId) ?? null)
      })
      .catch(() => {
        if (!cancelled) setPlugin(null)
      })
    return () => {
      cancelled = true
    }
  }, [pluginId, reloadToken])

  return plugin
}
