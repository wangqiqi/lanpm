import { useEffect, useState } from 'react'
import { Form, Input, Modal, Radio, Switch } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { GroupType } from '@shared/navigation/types'
import { DEFAULT_GROUP_AUTO_DISCOVER } from '@shared/group/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'

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
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const [form] = Form.useForm<{ type: GroupType; name: string; autoDiscover: boolean }>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ type: 'project', autoDiscover: DEFAULT_GROUP_AUTO_DISCOVER, name: '' })
    }
  }, [open, form])

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await onCreate(values)
      onClose()
    } catch (err) {
      message.error(formatError(err, 'group.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('group.createTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={() => void submit()}>
        <Form.Item name="type" label={t('group.type')} rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            options={[
              { label: t('group.typeProject'), value: 'project' },
              { label: t('group.typeFunction'), value: 'function' },
              { label: t('group.typeAnonymous'), value: 'anonymous' }
            ]}
          />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('group.name')}
          rules={[{ required: true, min: 2, max: 40, message: t('group.nameRule') }]}
        >
          <Input
            placeholder={t('group.namePlaceholder')}
            onPressEnter={submitFormOnEnter(form)}
          />
        </Form.Item>
        <Form.Item
          name="autoDiscover"
          label={t('group.autoDiscover')}
          extra={t('group.autoDiscoverHint')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
