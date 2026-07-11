import { useCallback, useEffect, useState } from 'react'
import { List, Switch, Tag, Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'
import styles from './PluginsPanel.module.css'

const { Text } = Typography

/** Profile「扩展」Tab — 启停官方插件 */
export default function PluginsPanel(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const [plugins, setPlugins] = useState<PluginView[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const list = await getLanpmApi().plugin.listPlugins()
      setPlugins(list)
    } catch (err) {
      message.error(formatError(err, 'plugin.listFailed'))
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }, [formatError, message])

  useEffect(() => {
    void load()
  }, [load])

  const onToggle = async (plugin: PluginView, enabled: boolean): Promise<void> => {
    setBusyId(plugin.id)
    try {
      const next = await getLanpmApi().plugin.setEnabled(plugin.id, enabled)
      setPlugins(next)
      window.dispatchEvent(new CustomEvent(PLUGIN_ENABLED_CHANGED_EVENT))
      message.success(
        enabled ? t('plugin.toggleOn', { name: plugin.name }) : t('plugin.toggleOff', { name: plugin.name })
      )
    } catch (err) {
      message.error(formatError(err, 'plugin.toggleFailed'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.root}>
      <Text type="secondary">{t('plugin.enableTabHint')}</Text>
      <List
        className={styles.list}
        loading={loading}
        locale={{ emptyText: t('plugin.emptyList') }}
        dataSource={plugins}
        renderItem={(plugin) => (
          <List.Item
            className={styles.item}
            actions={[
              <Switch
                key="sw"
                checked={plugin.enabled}
                loading={busyId === plugin.id}
                disabled={busyId !== null && busyId !== plugin.id}
                aria-label={t('plugin.toggleAria', { name: plugin.name })}
                onChange={(checked) => void onToggle(plugin, checked)}
              />
            ]}
          >
            <List.Item.Meta
              title={
                <span className={styles.titleRow}>
                  <span>{plugin.name}</span>
                  <Tag>{plugin.pricing === 'paid' ? t('plugin.pricingPaid') : t('plugin.pricingFree')}</Tag>
                </span>
              }
              description={
                <Text type="secondary">
                  {plugin.id} · v{plugin.version}
                  {plugin.enabled ? '' : ` · ${t('plugin.statusOff')}`}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  )
}
