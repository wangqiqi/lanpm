import { Form, Input, Modal } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'

interface TaskCreateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (title: string) => Promise<void>
}

export default function TaskCreateModal({
  open,
  onClose,
  onSubmit
}: TaskCreateModalProps): React.ReactElement {
  const { t } = useI18n()
  const [form] = Form.useForm<{ title: string }>()

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields()
    await onSubmit(values.title.trim())
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={t('chat.taskModalTitle')}
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      destroyOnHidden
      okText={t('common.create')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label={t('chat.taskTitleLabel')}
          rules={[{ required: true, message: t('chat.taskTitleRequired') }]}
        >
          <Input placeholder={t('chat.taskTitlePlaceholder')} autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  )
}
