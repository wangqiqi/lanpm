import { Form, Input, Modal } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'
import { TASK_TITLE_MAX_LENGTH } from '@shared/task/validation'

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
      onOk={() => form.submit()}
      destroyOnHidden
      okText={t('common.create')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" onFinish={() => void handleOk()}>
        <Form.Item
          name="title"
          label={t('chat.taskTitleLabel')}
          rules={[
            { required: true, message: t('chat.taskTitleRequired') },
            {
              max: TASK_TITLE_MAX_LENGTH,
              message: t('task.titleTooLong', { max: TASK_TITLE_MAX_LENGTH })
            }
          ]}
        >
          <Input
            placeholder={t('chat.taskTitlePlaceholder')}
            maxLength={TASK_TITLE_MAX_LENGTH}
            autoFocus
            onPressEnter={submitFormOnEnter(form)}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
