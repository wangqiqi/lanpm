import { useEffect, useState } from 'react'
import { Form, Input, Modal, Radio, Switch } from 'antd'
import type { GroupType } from '@shared/navigation/types'

interface CreateGroupModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: { type: GroupType; name: string; autoDiscover: boolean }) => Promise<void>
}

export default function CreateGroupModal({
  open,
  onClose,
  onCreate
}: CreateGroupModalProps): React.ReactElement {
  const [form] = Form.useForm<{ type: GroupType; name: string; autoDiscover: boolean }>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ type: 'project', autoDiscover: true, name: '' })
    }
  }, [open, form])

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await onCreate(values)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="创建群组"
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="type" label="群组类型" rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            options={[
              { label: '项目群', value: 'project' },
              { label: '职能群', value: 'function' },
              { label: '匿名群', value: 'anonymous' }
            ]}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="群组名称"
          rules={[{ required: true, min: 2, max: 40, message: '名称 2–40 字' }]}
        >
          <Input placeholder="例如：LanPM 开发组" />
        </Form.Item>
        <Form.Item name="autoDiscover" label="局域网自动发现" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
