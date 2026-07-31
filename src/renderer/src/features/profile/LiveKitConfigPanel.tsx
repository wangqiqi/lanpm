import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Typography } from 'antd'
import type { LiveKitConfig } from '@shared/media/livekitConfig'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { useLiveKitConfigStore } from '@renderer/stores/liveKitConfigStore'
import styles from './LiveKitConfigPanel.module.css'

const { Text } = Typography

interface FormValues {
  url: string
  apiKey: string
  apiSecret: string
}

/** Profile「会议旁路」— LiveKit 自托管 URL / Key / Secret */
export default function LiveKitConfigPanel(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const publicConfig = useLiveKitConfigStore((s) => s.publicConfig)
  const hydrate = useLiveKitConfigStore((s) => s.hydrate)
  const setConfig = useLiveKitConfigStore((s) => s.setConfig)
  const [form] = Form.useForm<FormValues>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!publicConfig) return
    form.setFieldsValue({
      url: publicConfig.url,
      apiKey: publicConfig.apiKey,
      apiSecret: ''
    })
  }, [publicConfig, form])

  const onSave = useCallback(async (): Promise<void> => {
    const values = await form.validateFields()
    setBusy(true)
    try {
      const input: LiveKitConfig = {
        url: values.url,
        apiKey: values.apiKey,
        apiSecret: values.apiSecret
      }
      await setConfig(input)
      message.success(t('profile.livekitSaved'))
      form.setFieldValue('apiSecret', '')
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('profile.livekitSaveFailed'))
    } finally {
      setBusy(false)
    }
  }, [form, message, setConfig, t])

  return (
    <div className={styles.root}>
      <Text type="secondary" className={styles.hint}>
        {t('profile.livekitHint')}
      </Text>
      {publicConfig?.configured ? (
        <Text type="success" className={styles.status}>
          {t('profile.livekitConfigured')}
        </Text>
      ) : (
        <Text type="warning" className={styles.status}>
          {t('profile.livekitNotConfigured')}
        </Text>
      )}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="url"
          label={t('profile.livekitUrl')}
          rules={[{ required: true, message: t('profile.livekitUrlRequired') }]}
        >
          <Input placeholder="ws://192.168.1.10:7880" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={t('profile.livekitApiKey')}
          rules={[{ required: true, message: t('profile.livekitApiKeyRequired') }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="apiSecret"
          label={t('profile.livekitApiSecret')}
          extra={t('profile.livekitApiSecretHint')}
          rules={[{ required: !publicConfig?.configured, message: t('profile.livekitApiSecretRequired') }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" loading={busy} onClick={() => void onSave()}>
          {t('common.save')}
        </Button>
      </Form>
    </div>
  )
}
