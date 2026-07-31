import { useEffect, useState } from 'react'
import type { ContributedPluginView } from '@shared/plugin/contributions'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { PLUGIN_ENABLED_CHANGED_EVENT } from './pluginEvents'

export function useContributedViews(): ContributedPluginView[] {
  const [views, setViews] = useState<ContributedPluginView[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onChanged = (): void => setReloadToken((n) => n + 1)
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .plugin.listContributedViews()
      .then((list) => {
        if (!cancelled) setViews(list)
      })
      .catch(() => {
        if (!cancelled) setViews([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  return views
}
