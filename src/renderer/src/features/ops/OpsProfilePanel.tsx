import { useEffect, useState } from 'react'
import { Alert, Descriptions, Divider, Table, Tag, Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { OpsMachineRecord } from '@shared/ops/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import OpsAuditPanel from './OpsAuditPanel'

const { Text, Paragraph, Title } = Typography

const AGENT_CLI_EXAMPLE =
  'lanpm agent start --name prod-01 --root ./data --pairing-code <code> [--host <ip>]'

interface Props {
  plugin: PluginView
  groupId?: string
}

export default function OpsProfilePanel({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const [machines, setMachines] = useState<OpsMachineRecord[]>([])
  const [machinesLoading, setMachinesLoading] = useState(false)

  useEffect(() => {
    if (!groupId) {
      setMachines([])
      return
    }
    let cancelled = false
    setMachinesLoading(true)
    void getLanpmApi()
      .ops.listMachines(groupId)
      .then((list) => {
        if (!cancelled) setMachines(list)
      })
      .catch(() => {
        if (!cancelled) setMachines([])
      })
      .finally(() => {
        if (!cancelled) setMachinesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  const licenseTag =
    plugin.pricing === 'paid' ? (
      <Tag color={plugin.licensed ? 'green' : 'orange'}>
        {plugin.licensed ? t('plugin.licenseActive') : t('plugin.licenseMissing')}
      </Tag>
    ) : (
      <Tag>{t('plugin.opsProfileLicenseFree')}</Tag>
    )

  return (
    <div>
      {!plugin.enabled ? (
        <Alert type="warning" showIcon message={t('plugin.opsProfileDisabledHint')} style={{ marginBottom: 16 }} />
      ) : null}

      <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t('plugin.opsProfilePluginState')}>
          <Tag color={plugin.enabled ? 'blue' : 'default'}>
            {plugin.enabled ? t('plugin.opsProfileEnabled') : t('plugin.opsProfileDisabled')}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('plugin.opsProfileLicenseLabel')}>{licenseTag}</Descriptions.Item>
      </Descriptions>

      <Title level={5}>{t('plugin.opsProfilePairingTitle')}</Title>
      <Paragraph type="secondary">{t('plugin.opsProfilePairingBody')}</Paragraph>
      <Paragraph type="secondary">{t('plugin.opsProfilePairingDiscover')}</Paragraph>
      <Paragraph>
        <Text code copyable={{ text: AGENT_CLI_EXAMPLE }}>
          {AGENT_CLI_EXAMPLE}
        </Text>
      </Paragraph>

      <Divider />

      <Title level={5}>{t('plugin.opsProfileAgentTitle')}</Title>
      {!groupId ? (
        <Alert type="info" showIcon message={t('plugin.opsProfileAgentNoGroup')} style={{ marginBottom: 16 }} />
      ) : (
        <Table
          size="small"
          rowKey="deviceId"
          loading={machinesLoading}
          pagination={false}
          locale={{ emptyText: t('plugin.opsProfileAgentEmpty') }}
          dataSource={machines}
          style={{ marginBottom: 16 }}
          columns={[
            {
              title: t('plugin.opsProfileMachineName'),
              dataIndex: 'displayName',
              ellipsis: true
            },
            {
              title: t('plugin.opsProfileMachineStatus'),
              dataIndex: 'online',
              width: 88,
              render: (online: boolean) => (
                <Tag color={online ? 'green' : 'default'}>
                  {online ? t('plugin.opsProfileMachineOnline') : t('plugin.opsProfileMachineOffline')}
                </Tag>
              )
            },
            {
              title: t('plugin.opsProfileMachineRoot'),
              dataIndex: 'root',
              ellipsis: true
            }
          ]}
        />
      )}

      <Divider />

      <OpsAuditPanel groupId={groupId} />
    </div>
  )
}
