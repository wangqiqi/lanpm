import { useEffect, useState } from 'react'
import { Input, Modal } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'

interface EditMessageModalProps {
  open: boolean
  initialText: string
  onCancel: () => void
  onConfirm: (text: string) => Promise<void>
}

export default function EditMessageModal({
  open,
  initialText,
  onCancel,
  onConfirm
}: EditMessageModalProps): React.ReactElement {
  const { t } = useI18n()
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setText(initialText)
  }, [open, initialText])

  const handleOk = async (): Promise<void> => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onConfirm(trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('chat.editMessage')}
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !text.trim(), loading: saving }}
      destroyOnClose
    >
      <Input.TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoSize={{ minRows: 3, maxRows: 8 }}
        maxLength={4000}
      />
    </Modal>
  )
}
