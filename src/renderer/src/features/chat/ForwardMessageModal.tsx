import { useMemo, useState } from 'react'
import { Modal, Select } from 'antd'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useI18n } from '@renderer/i18n/useI18n'

interface ForwardMessageModalProps {
  open: boolean
  sourceGroupId: string
  onCancel: () => void
  onConfirm: (targetGroupId: string) => Promise<void>
}

export default function ForwardMessageModal({
  open,
  sourceGroupId,
  onCancel,
  onConfirm
}: ForwardMessageModalProps): React.ReactElement {
  const { t } = useI18n()
  const groups = useNavigationStore((s) => s.groups)
  const [targetGroupId, setTargetGroupId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const options = useMemo(
    () =>
      groups
        .filter((g) => g.groupId !== sourceGroupId)
        .map((g) => ({ value: g.groupId, label: g.name })),
    [groups, sourceGroupId]
  )

  const handleOk = async (): Promise<void> => {
    if (!targetGroupId) return
    setSaving(true)
    try {
      await onConfirm(targetGroupId)
      setTargetGroupId(undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('chat.forwardMessage')}
      open={open}
      onCancel={() => {
        setTargetGroupId(undefined)
        onCancel()
      }}
      onOk={() => void handleOk()}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !targetGroupId, loading: saving }}
      destroyOnClose
    >
      <Select
        style={{ width: '100%' }}
        placeholder={t('chat.forwardPickGroup')}
        options={options}
        value={targetGroupId}
        onChange={setTargetGroupId}
        showSearch
        optionFilterProp="label"
      />
    </Modal>
  )
}
