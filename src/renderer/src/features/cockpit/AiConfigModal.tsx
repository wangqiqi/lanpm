import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Switch } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AiConfigInput, AiConfigView, AiProvider } from '@shared/cockpit/types'
import {
  AI_PROVIDER_PRESETS,
  defaultAiProviderPreset,
  getAiProviderPreset
} from '@shared/cockpit/aiProviders'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'

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
  const [probing, setProbing] = useState(false)
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
      patrolEnabled: config?.patrolEnabled ?? true,
      patrolIntervalHours: config?.patrolIntervalHours ?? 24,
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
        patrolEnabled: values.patrolEnabled,
        patrolIntervalHours: Number(values.patrolIntervalHours) || 24,
        apiKey: values.apiKey?.trim() || undefined
      })
      onClose()
    } catch (err) {
      message.error(formatError(err, 'ai.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const runProbe = async (): Promise<void> => {
    const values = await form.validateFields(['baseUrl', 'apiKey'])
    const api = getLanpmApi().ai
    if (!api?.probeEndpoint) {
      message.error(t('ai.apiUnavailable'))
      return
    }
    setProbing(true)
    try {
      const result = await api.probeEndpoint({
        baseUrl: values.baseUrl,
        apiKey: values.apiKey?.trim() || undefined
      })
      if (result.reachable) {
        message.success(t('ai.probeSuccess'))
      } else {
        message.warning(t('ai.probeFailed'))
      }
    } catch (err) {
      message.error(formatError(err, 'ai.probeFailed'))
    } finally {
      setProbing(false)
    }
  }

  return (
    <Modal
      title={t('ai.configTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={() => void submit()}>
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
          <Input onPressEnter={submitFormOnEnter(form)} />
        </Form.Item>
        <Form.Item name="model" label={t('ai.model')} rules={[{ required: true }]}>
          <Input onPressEnter={submitFormOnEnter(form)} />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={config?.hasApiKey ? t('ai.apiKeyKeep') : t('ai.apiKey')}
          rules={config?.hasApiKey ? [] : [{ required: true, message: t('ai.apiKeyRequired') }]}
        >
          <Input.Password
            placeholder={apiKeyPlaceholder}
            autoComplete="off"
            onPressEnter={submitFormOnEnter(form)}
          />
        </Form.Item>
        <Form.Item name="enabled" label={t('ai.enableExternal')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="patrolEnabled" label={t('ai.patrolEnable')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="patrolIntervalHours" label={t('ai.patrolIntervalHours')}>
          <Input type="number" min={1} max={168} />
        </Form.Item>
        <Form.Item>
          <Button loading={probing} onClick={() => void runProbe()}>
            {t('ai.probeConnection')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
