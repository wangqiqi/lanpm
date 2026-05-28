import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select, Switch } from 'antd'
import type { AiConfigInput, AiConfigView, AiProvider } from '@shared/cockpit/types'

const PROVIDERS: { label: string; value: AiProvider; baseUrl: string; model: string }[] = [
  { label: 'OpenAI', value: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  {
    label: 'Anthropic',
    value: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest'
  },
  { label: '自定义', value: 'custom', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
]

interface AiConfigModalProps {
  open: boolean
  config: AiConfigView | null
  onClose: () => void
  onSave: (input: AiConfigInput) => Promise<void>
}

export default function AiConfigModal({
  open,
  config,
  onClose,
  onSave
}: AiConfigModalProps): React.ReactElement {
  const [form] = Form.useForm<AiConfigInput & { apiKey?: string }>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      provider: config?.provider ?? 'openai',
      baseUrl: config?.baseUrl ?? PROVIDERS[0].baseUrl,
      model: config?.model ?? PROVIDERS[0].model,
      enabled: config?.enabled ?? false,
      apiKey: ''
    })
  }, [open, config, form])

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await onSave({
        provider: values.provider,
        baseUrl: values.baseUrl,
        model: values.model,
        enabled: values.enabled,
        apiKey: values.apiKey?.trim() || undefined
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="API Key 配置"
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="provider" label="服务商" rules={[{ required: true }]}>
          <Select
            options={PROVIDERS.map((p) => ({ label: p.label, value: p.value }))}
            onChange={(v: AiProvider) => {
              const preset = PROVIDERS.find((p) => p.value === v)
              if (preset) form.setFieldsValue({ baseUrl: preset.baseUrl, model: preset.model })
            }}
          />
        </Form.Item>
        <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="model" label="模型" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={config?.hasApiKey ? 'API Key（留空则保留原密钥）' : 'API Key'}
          rules={config?.hasApiKey ? [] : [{ required: true, message: '请填写 API Key' }]}
        >
          <Input.Password placeholder="sk-..." autoComplete="off" />
        </Form.Item>
        <Form.Item name="enabled" label="启用外部 AI" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
