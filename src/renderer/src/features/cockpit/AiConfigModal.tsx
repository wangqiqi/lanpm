import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select, Switch } from 'antd'
import type { AiConfigInput, AiConfigView, AiProvider } from '@shared/cockpit/types'
import {
  AI_PROVIDER_PRESETS,
  defaultAiProviderPreset,
  getAiProviderPreset
} from '@shared/cockpit/aiProviders'

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
  const [provider, setProvider] = useState<AiProvider>(defaultAiProviderPreset().value)

  useEffect(() => {
    if (!open) return
    const fallback = defaultAiProviderPreset()
    const preset = config ? getAiProviderPreset(config.provider) : fallback
    const initialProvider = config?.provider ?? fallback.value
    setProvider(initialProvider)
    form.setFieldsValue({
      provider: initialProvider,
      baseUrl: config?.baseUrl ?? preset?.baseUrl ?? fallback.baseUrl,
      model: config?.model ?? preset?.model ?? fallback.model,
      enabled: config?.enabled ?? false,
      apiKey: ''
    })
  }, [open, config, form])

  const apiKeyPlaceholder =
    getAiProviderPreset(provider)?.apiKeyPlaceholder ?? 'sk-...'

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
            options={AI_PROVIDER_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
            onChange={(v: AiProvider) => {
              setProvider(v)
              const preset = getAiProviderPreset(v)
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
          <Input.Password placeholder={apiKeyPlaceholder} autoComplete="off" />
        </Form.Item>
        <Form.Item name="enabled" label="启用外部 AI" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
