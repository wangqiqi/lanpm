import { Form, Input, Modal } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'

interface OtherReasonModalProps {
  open: boolean
  taskTitle?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}

export default function OtherReasonModal({
  open,
  taskTitle,
  loading,
  onCancel,
  onConfirm
}: OtherReasonModalProps): React.ReactElement {
  const { t } = useI18n()
  const [form] = Form.useForm<{ reason: string }>()

  return (
    <Modal
      title={t('board.otherModalTitle')}
      open={open}
      destroyOnClose
      confirmLoading={loading}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      onCancel={() => {
        form.resetFields()
        onCancel()
      }}
      onOk={async () => {
        const values = await form.validateFields()
        onConfirm(values.reason.trim())
        form.resetFields()
      }}
    >
      {taskTitle && (
        <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.65)' }}>
          {t('board.otherModalTask', { title: taskTitle })}
        </p>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={t('board.otherReasonLabel')}
          rules={[{ required: true, whitespace: true, message: t('board.otherReasonRequired') }]}
        >
          <Input.TextArea rows={3} placeholder={t('board.otherReasonPlaceholder')} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
