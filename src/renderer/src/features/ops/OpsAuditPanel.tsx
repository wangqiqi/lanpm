import { useEffect, useState } from 'react'
import { Table, Typography } from 'antd'
import type { OpsAuditEntry } from '@shared/ops/auditTypes'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'

interface Props {
  groupId?: string
}

export default function OpsAuditPanel({ groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const [rows, setRows] = useState<OpsAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getLanpmApi()
      .ops.listAudit(groupId || undefined, 50)
      .then((entries: OpsAuditEntry[]) => {
        if (!cancelled) setRows(entries)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t('plugin.opsAuditHint')}
      </Typography.Paragraph>
      <Table
        size="small"
        rowKey="requestId"
        loading={loading}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        dataSource={rows}
        locale={{ emptyText: t('plugin.opsAuditEmpty') }}
        columns={[
          {
            title: t('plugin.opsAuditWhen'),
            dataIndex: 'issuedAt',
            width: 168,
            render: (value: string) => new Date(value).toLocaleString()
          },
          {
            title: t('plugin.opsAuditWho'),
            dataIndex: 'actorName',
            width: 100,
            ellipsis: true
          },
          {
            title: t('plugin.opsAuditCommand'),
            dataIndex: 'commandLine',
            ellipsis: true
          },
          {
            title: t('plugin.opsAuditResult'),
            key: 'result',
            ellipsis: true,
            render: (_: unknown, row: OpsAuditEntry) =>
              row.status === 'pending'
                ? t('plugin.opsAuditPending')
                : (row.resultSummary ?? row.status)
          }
        ]}
      />
    </div>
  )
}
