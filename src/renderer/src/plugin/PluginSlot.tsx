import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import type { PluginSlotId, PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import PluginErrorBoundary from './PluginErrorBoundary'
import { resolvePluginComponent } from './registry'
import { PLUGIN_ENABLED_CHANGED_EVENT } from './pluginEvents'
import styles from './plugin.module.css'

const { Text } = Typography

interface Props {
  slotId: PluginSlotId
  groupId: string
  taskId: string
}

export default function PluginSlot({ slotId, groupId, taskId }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const [plugins, setPlugins] = useState<PluginView[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onChanged = (): void => setReloadToken((n) => n + 1)
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .plugin.listSlotPlugins(slotId)
      .then((list) => {
        if (!cancelled) setPlugins(list)
      })
      .catch(() => {
        if (!cancelled) setPlugins([])
      })
    return () => {
      cancelled = true
    }
  }, [slotId, groupId, taskId, reloadToken])

  if (plugins.length === 0) return null

  return (
    <div className={styles.slot} data-plugin-slot={slotId}>
      <Text type="secondary">{t('plugin.slotSection')}</Text>
      {plugins.map((plugin) => {
        const Comp = resolvePluginComponent(plugin.id)
        if (!Comp) {
          return (
            <div key={plugin.id} className={styles.card}>
              <Text type="secondary">{t('plugin.unknownBuiltin', { id: plugin.id })}</Text>
            </div>
          )
        }
        return (
          <PluginErrorBoundary key={plugin.id} pluginId={plugin.id}>
            <Comp plugin={plugin} groupId={groupId} taskId={taskId} />
          </PluginErrorBoundary>
        )
      })}
    </div>
  )
}
