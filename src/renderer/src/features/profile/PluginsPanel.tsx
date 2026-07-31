import { useCallback, useEffect, useState } from 'react'
import { Button, Input, List, Modal, Switch, Tag, Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'
import styles from './PluginsPanel.module.css'

const { Text } = Typography
const { TextArea } = Input

function localizedPluginName(
  pluginId: string,
  fallback: string,
  t: (
    key: 'plugin.name.example' | 'plugin.name.formjs' | 'plugin.name.meeting' | 'plugin.name.mindmap',
    params?: never
  ) => string
): string {
  if (pluginId === 'lanpm.example') return t('plugin.name.example')
  if (pluginId === 'lanpm.formjs') return t('plugin.name.formjs')
  if (pluginId === 'lanpm.meeting') return t('plugin.name.meeting')
  if (pluginId === 'lanpm.mindmap') return t('plugin.name.mindmap')
  return fallback
}

/** Profile「扩展」Tab — 启停官方插件 */
export default function PluginsPanel(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const [plugins, setPlugins] = useState<PluginView[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)

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
    const label = localizedPluginName(plugin.id, plugin.name, t)
    try {
      const next = await getLanpmApi().plugin.setEnabled(plugin.id, enabled)
      setPlugins(next)
      window.dispatchEvent(new CustomEvent(PLUGIN_ENABLED_CHANGED_EVENT))
      message.success(
        enabled ? t('plugin.toggleOn', { name: label }) : t('plugin.toggleOff', { name: label })
      )
    } catch (err) {
      message.error(formatError(err, 'plugin.toggleFailed'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const onImportLicense = async (): Promise<void> => {
    setImportBusy(true)
    try {
      await getLanpmApi().plugin.importLicense(importText)
      message.success(t('plugin.importLicenseOk'))
      setImportOpen(false)
      setImportText('')
      await load()
    } catch (err) {
      message.error(formatError(err, 'plugin.importLicenseFailed'))
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className={styles.root}>
      <Text type="secondary">{t('plugin.enableTabHint')}</Text>
      <div className={styles.toolbar}>
        <Button size="small" onClick={() => setImportOpen(true)}>
          {t('plugin.importLicense')}
        </Button>
      </div>
      <List
        className={styles.list}
        loading={loading}
        locale={{ emptyText: t('plugin.emptyList') }}
        dataSource={plugins}
        renderItem={(plugin) => {
          const title = localizedPluginName(plugin.id, plugin.name, t)
          const licenseTag =
            plugin.pricing === 'paid' ? (
              <Tag color={plugin.licensed ? 'green' : 'orange'}>
                {plugin.licensed ? t('plugin.licenseActive') : t('plugin.licenseMissing')}
              </Tag>
            ) : null
          const sourceTag =
            plugin.source === 'sideload' ? (
              <Tag>{t('plugin.sourceSideload')}</Tag>
            ) : null
          return (
            <List.Item
              className={styles.item}
              actions={[
                <Switch
                  key="sw"
                  checked={plugin.enabled}
                  loading={busyId === plugin.id}
                  disabled={busyId !== null && busyId !== plugin.id}
                  aria-label={t('plugin.toggleAria', { name: title })}
                  onChange={(checked) => void onToggle(plugin, checked)}
                />
              ]}
            >
              <List.Item.Meta
                title={
                  <span className={styles.titleRow}>
                    <span>{title}</span>
                    <Tag>{plugin.pricing === 'paid' ? t('plugin.pricingPaid') : t('plugin.pricingFree')}</Tag>
                    {licenseTag}
                    {sourceTag}
                  </span>
                }
                description={
                  <Text type="secondary">
                    {plugin.id} · v{plugin.version}
                    {plugin.source === 'sideload' && !plugin.signatureValid
                      ? ` · ${t('plugin.signatureInvalid')}`
                      : ''}
                    {plugin.enabled ? '' : ` · ${t('plugin.statusOff')}`}
                  </Text>
                }
              />
            </List.Item>
          )
        }}
      />
      <Modal
        title={t('plugin.importLicense')}
        open={importOpen}
        confirmLoading={importBusy}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onOk={() => void onImportLicense()}
        onCancel={() => setImportOpen(false)}
      >
        <Text type="secondary">{t('plugin.importLicenseHint')}</Text>
        <TextArea
          className={styles.licenseInput}
          rows={6}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"pluginId":"lanpm.formjs","features":["license.feature"]}'
        />
      </Modal>
    </div>
  )
}
