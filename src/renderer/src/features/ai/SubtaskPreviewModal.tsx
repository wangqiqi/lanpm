import { useMemo } from 'react'
import { Button, Checkbox, Input, Modal, Select, Spin, Typography } from 'antd'
import type { AiSubtaskProposal } from '@shared/ai/subtaskSchemas'
import { useI18n } from '@renderer/i18n/useI18n'

const { Text } = Typography

export interface SubtaskPreviewRow extends AiSubtaskProposal {
  key: string
  selected: boolean
}

interface SubtaskPreviewModalProps {
  open: boolean
  loading: boolean
  proposals: SubtaskPreviewRow[]
  memberOptions: { value: string; label: string }[]
  usedExternalAi: boolean
  degraded?: boolean
  onChange: (rows: SubtaskPreviewRow[]) => void
  onCancel: () => void
  onConfirm: (rows: SubtaskPreviewRow[]) => void
  confirming: boolean
}

export default function SubtaskPreviewModal({
  open,
  loading,
  proposals,
  memberOptions,
  usedExternalAi,
  degraded,
  onChange,
  onCancel,
  onConfirm,
  confirming
}: SubtaskPreviewModalProps): React.ReactElement {
  const { t } = useI18n()
  const selectedCount = useMemo(() => proposals.filter((p) => p.selected).length, [proposals])

  const updateRow = (key: string, patch: Partial<SubtaskPreviewRow>): void => {
    onChange(proposals.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  return (
    <Modal
      title={t('ai.subtaskPreviewTitle')}
      open={open}
      onCancel={onCancel}
      width={640}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={confirming}
          disabled={loading || selectedCount === 0}
          onClick={() => onConfirm(proposals.filter((p) => p.selected))}
        >
          {t('ai.subtaskConfirmCreate', { count: String(selectedCount) })}
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{t('ai.subtaskLoading')}</Text>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <Text type="secondary">{t('ai.subtaskEmpty')}</Text>
      ) : (
        <>
          {degraded ? (
            <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
              {t('ai.subtaskDegraded')}
            </Text>
          ) : null}
          {!usedExternalAi ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              {t('ai.subtaskLocalOnly')}
            </Text>
          ) : null}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {proposals.map((row) => (
              <li
                key={row.key}
                style={{
                  border: '1px solid var(--lanpm-border-subtle, #e8e8e8)',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Checkbox
                    checked={row.selected}
                    onChange={(e) => updateRow(row.key, { selected: e.target.checked })}
                  />
                  <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                    <Input
                      value={row.title}
                      onChange={(e) => updateRow(row.key, { title: e.target.value })}
                      maxLength={200}
                    />
                    <Select
                      allowClear
                      placeholder={t('ai.subtaskAssigneeOptional')}
                      style={{ width: '100%' }}
                      options={memberOptions}
                      value={row.suggestedAssigneeUserId}
                      onChange={(v) => updateRow(row.key, { suggestedAssigneeUserId: v })}
                    />
                    <Input
                      type="date"
                      value={row.suggestedEndDate ?? ''}
                      onChange={(e) =>
                        updateRow(row.key, {
                          suggestedEndDate: e.target.value || undefined
                        })
                      }
                    />
                    {row.rationale ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {row.rationale}
                      </Text>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}

export function proposalsToRows(proposals: AiSubtaskProposal[]): SubtaskPreviewRow[] {
  return proposals.map((p, i) => ({
    ...p,
    key: `row_${i}`,
    selected: true
  }))
}
