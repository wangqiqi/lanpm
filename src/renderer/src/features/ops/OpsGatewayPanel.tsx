import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Descriptions, InputNumber, Space, Switch, Typography, message } from 'antd'
import type { OpsGatewayStatus } from '@shared/ops/gatewayTypes'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

const { Text, Paragraph, Title } = Typography

interface Props {
  pluginEnabled: boolean
}

export default function OpsGatewayPanel({ pluginEnabled }: Props): React.ReactElement {
  const { t } = useI18n()
  const [status, setStatus] = useState<OpsGatewayStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [portDraft, setPortDraft] = useState<number>(8787)

  const refresh = useCallback(async () => {
    try {
      const next = await getLanpmApi().ops.getGatewayStatus()
      setStatus(next)
      setPortDraft(next.port)
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (fn: () => Promise<OpsGatewayStatus>) => {
    setLoading(true)
    try {
      const next = await fn()
      setStatus(next)
      setPortDraft(next.port)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('plugin.opsGatewayActionFailed'))
    } finally {
      setLoading(false)
    }
  }

  const savePort = async () => {
    if (!status || status.running) return
    await run(() => getLanpmApi().ops.updateGatewayConfig({ port: portDraft }))
    message.success(t('plugin.opsGatewayPortSaved'))
  }

  const toggleTerminal = async (checked: boolean) => {
    if (!status || status.running) return
    await run(() => getLanpmApi().ops.updateGatewayConfig({ terminalEnabled: checked }))
  }

  return (
    <div>
      <Title level={5}>{t('plugin.opsGatewayTitle')}</Title>
      <Paragraph type="secondary">{t('plugin.opsGatewayBody')}</Paragraph>

      {!pluginEnabled ? (
        <Alert type="warning" showIcon message={t('plugin.opsGatewayDisabledHint')} style={{ marginBottom: 16 }} />
      ) : null}

      <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t('plugin.opsGatewayStatusLabel')}>
          {status?.running ? t('plugin.opsGatewayRunning') : t('plugin.opsGatewayStopped')}
        </Descriptions.Item>
        <Descriptions.Item label={t('plugin.opsGatewayUrlLabel')}>
          {status?.url ? (
            <Text code copyable>
              {status.url}
            </Text>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('plugin.opsGatewayTokenLabel')}>
          {status?.token ? (
            <Text code copyable>
              {status.token}
            </Text>
          ) : (
            '—'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('plugin.opsGatewayRootLabel')}>
          <Text ellipsis>{status?.root ?? '—'}</Text>
        </Descriptions.Item>
      </Descriptions>

      <Space wrap style={{ marginBottom: 16 }}>
        <span>{t('plugin.opsGatewayPortLabel')}</span>
        <InputNumber
          min={1024}
          max={65535}
          value={portDraft}
          disabled={!pluginEnabled || status?.running}
          onChange={(v) => setPortDraft(typeof v === 'number' ? v : 8787)}
        />
        <Button disabled={!pluginEnabled || status?.running} onClick={() => void savePort()}>
          {t('plugin.opsGatewaySavePort')}
        </Button>
      </Space>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>{t('plugin.opsGatewayTerminalLabel')}</span>
          <Switch
            checked={status?.terminalEnabled ?? false}
            disabled={!pluginEnabled || status?.running}
            onChange={(checked) => void toggleTerminal(checked)}
          />
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          {t('plugin.opsGatewayTerminalHint')}
        </Paragraph>
      </div>

      <Space wrap>
        <Button
          type="primary"
          loading={loading}
          disabled={!pluginEnabled || status?.running}
          onClick={() => void run(() => getLanpmApi().ops.startGateway())}
        >
          {t('plugin.opsGatewayStart')}
        </Button>
        <Button
          danger
          loading={loading}
          disabled={!pluginEnabled || !status?.running}
          onClick={() => void run(() => getLanpmApi().ops.stopGateway())}
        >
          {t('plugin.opsGatewayStop')}
        </Button>
        <Button
          disabled={!pluginEnabled || status?.running}
          onClick={() => void run(() => getLanpmApi().ops.rotateGatewayToken())}
        >
          {t('plugin.opsGatewayRotateToken')}
        </Button>
      </Space>

      {status?.lastError ? (
        <Alert type="error" showIcon message={status.lastError} style={{ marginTop: 16 }} />
      ) : null}
    </div>
  )
}
