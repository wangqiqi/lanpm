import { Form, Input, Modal } from 'antd'

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
  const [form] = Form.useForm<{ title: string }>()

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields()
    await onSubmit(values.title.trim())
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="快捷创建任务"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void handleOk()}
      destroyOnHidden
      okText="创建"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="任务标题"
          rules={[{ required: true, message: '请输入任务标题' }]}
        >
          <Input placeholder="例如：修复登录页样式" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  )
}
