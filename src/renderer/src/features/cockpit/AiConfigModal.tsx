import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select, Switch } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AiConfigInput, AiConfigView, AiProvider } from '@shared/cockpit/types'
import {
  AI_PROVIDER_PRESETS,
  defaultAiProviderPreset,
  getAiProviderPreset
} from '@shared/cockpit/aiProviders'
import { useI18n } from '@renderer/i18n/useI18n'

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
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
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
    } catch (err) {
      message.error(formatError(err, 'ai.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('ai.configTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="provider" label={t('ai.provider')} rules={[{ required: true }]}>
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
        <Form.Item name="model" label={t('ai.model')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={config?.hasApiKey ? t('ai.apiKeyKeep') : t('ai.apiKey')}
          rules={config?.hasApiKey ? [] : [{ required: true, message: t('ai.apiKeyRequired') }]}
        >
          <Input.Password placeholder={apiKeyPlaceholder} autoComplete="off" />
        </Form.Item>
        <Form.Item name="enabled" label={t('ai.enableExternal')} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
