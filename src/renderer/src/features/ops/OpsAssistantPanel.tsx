import { useCallback, useEffect, useState } from 'react'
import { Alert, Descriptions, Switch, Typography } from 'antd'
import type { OpsGroupSettings } from '@shared/ops/groupSettings'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

const { Title, Paragraph } = Typography

interface Props {
  groupId?: string
  pluginEnabled: boolean
}

export default function OpsAssistantPanel({ groupId, pluginEnabled }: Props): React.ReactElement {
  const { t } = useI18n()
  const [settings, setSettings] = useState<OpsGroupSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!groupId) {
      setSettings(null)
      return
    }
    setLoading(true)
    try {
      const next = await getLanpmApi().ops.getGroupSettings(groupId)
      setSettings(next)
    } catch {
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (patch: { assistantEnabled?: boolean; watchEnabled?: boolean }) => {
    if (!groupId) return
    const next = await getLanpmApi().ops.updateGroupSettings(groupId, patch)
    setSettings(next)
  }

  if (!groupId) {
    return (
      <Alert type="info" showIcon message={t('plugin.opsAssistantNoGroup')} style={{ marginBottom: 16 }} />
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Title level={5}>{t('plugin.opsAssistantTitle')}</Title>
      <Paragraph type="secondary">{t('plugin.opsAssistantBody')}</Paragraph>
      {!pluginEnabled ? (
        <Alert type="warning" showIcon message={t('plugin.opsProfileDisabledHint')} style={{ marginBottom: 12 }} />
      ) : null}
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label={t('plugin.opsAssistantBotLabel')}>
          <Switch
            checked={settings?.assistantEnabled ?? false}
            loading={loading}
            disabled={!pluginEnabled}
            onChange={(checked) => void patch({ assistantEnabled: checked })}
          />
          <span style={{ marginLeft: 8 }}>{t('plugin.opsAssistantBotHint')}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('plugin.opsWatchLabel')}>
          <Switch
            checked={settings?.watchEnabled ?? false}
            loading={loading}
            disabled={!pluginEnabled}
            onChange={(checked) => void patch({ watchEnabled: checked })}
          />
          <span style={{ marginLeft: 8 }}>{t('plugin.opsWatchHint')}</span>
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
