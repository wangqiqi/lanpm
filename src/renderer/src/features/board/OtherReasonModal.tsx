import { Form, Input, Modal } from 'antd'

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
  const [form] = Form.useForm<{ reason: string }>()

  return (
    <Modal
      title="移入 OTHER"
      open={open}
      destroyOnClose
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
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
        <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.65)' }}>任务：{taskTitle}</p>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="原因（必填）"
          rules={[{ required: true, whitespace: true, message: '请填写移入 OTHER 的原因' }]}
        >
          <Input.TextArea rows={3} placeholder="例如：需求变更、阻塞依赖…" maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
