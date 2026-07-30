import { useEffect, useState } from 'react'
import { Avatar, Button, Form, Input, Upload, type UploadProps } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { SetupStatus } from '@shared/identity'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { fileToDataUrl, defaultAvatarDataUrl, randomAvatarDataUrl } from './avatar'
import { useUiStore } from '@renderer/stores/uiStore'
import { useI18n } from '@renderer/i18n/useI18n'
import logoUrl from '@resources/logo.svg'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'
import NetworkPrereqStep from './NetworkPrereqStep'
import styles from './SetupWizard.module.css'

interface SetupWizardProps {
  onComplete: (status: SetupStatus) => void
}

interface FormValues {
  baseName: string
  department?: string
}

type SetupStep = 'network' | 'profile'

export default function SetupWizard({ onComplete }: SetupWizardProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const theme = useUiStore((s) => s.theme)
  const requestDiscoverCoachmark = useUiStore((s) => s.requestDiscoverCoachmark)
  const [step, setStep] = useState<SetupStep>('network')
  const [networkSkipped, setNetworkSkipped] = useState(false)
  const [form] = Form.useForm<FormValues>()
  const [avatarUrl, setAvatarUrl] = useState(() => defaultAvatarDataUrl('LP', theme))
  const [submitting, setSubmitting] = useState(false)
  const [deviceName, setDeviceName] = useState('')

  const baseName = Form.useWatch('baseName', form) ?? ''

  useEffect(() => {
    let cancelled = false
    try {
      const api = getLanpmApi()
      const fromHost = api.getSuggestedDeviceName()
      if (!cancelled && fromHost) setDeviceName(fromHost)
    } catch {
      /* preload / 桩未就绪 */
    }
    void getLanpmApi()
      .identity.getSetupStatus()
      .then((status) => {
        if (!cancelled && status.suggestedDeviceName) {
          setDeviceName(status.suggestedDeviceName)
        }
      })
      .catch(() => {
        /* 展示占位即可 */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRandomAvatar = (): void => {
    setAvatarUrl(randomAvatarDataUrl(baseName || 'LP'))
  }

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!file.type.startsWith('image/')) {
      message.error(t('setup.imageOnly'))
      return Upload.LIST_IGNORE
    }
    if (file.size > 512 * 1024) {
      message.error(t('setup.avatarTooLarge'))
      return Upload.LIST_IGNORE
    }
    try {
      setAvatarUrl(await fileToDataUrl(file))
    } catch {
      message.error(t('setup.readImageFailed'))
    }
    return Upload.LIST_IGNORE
  }

  const onFinish = async (values: FormValues): Promise<void> => {
    setSubmitting(true)
    try {
      const status = await getLanpmApi().identity.completeSetup({
        baseName: values.baseName.trim(),
        department: values.department?.trim() || undefined,
        avatarUrl
      })
      message.success(t('setup.saved'))
      if (networkSkipped) {
        requestDiscoverCoachmark()
      }
      onComplete(status)
    } catch (err) {
      message.error(formatError(err, 'setup.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'network') {
    return (
      <div className={styles.wrap}>
        <NetworkPrereqStep
          onContinue={() => {
            setNetworkSkipped(false)
            setStep('profile')
          }}
          onSkip={() => {
            setNetworkSkipped(true)
            setStep('profile')
          }}
        />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sheet}>
        <header className={styles.hero}>
          <img src={logoUrl} alt="" className={styles.appIcon} width={64} height={64} />
          <h1 className={styles.title}>{t('setup.welcome')}</h1>
          <p className={styles.subtitle}>{t('setup.subtitle')}</p>
        </header>

        <section className={styles.avatarBlock}>
          <Avatar src={avatarUrl} size={88} className={styles.avatar} />
          <div className={styles.avatarLinks}>
            <button type="button" className={styles.linkBtn} onClick={handleRandomAvatar}>
              <ReloadOutlined />
              {t('setup.randomAvatar')}
            </button>
            <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
              <span className={styles.linkBtn} role="button" tabIndex={0}>
                <UploadOutlined />
                {t('setup.uploadPhoto')}
              </span>
            </Upload>
          </div>
        </section>

        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          className={styles.form}
        >
          <section className={styles.group} aria-label={t('setup.basicInfo')}>
            <Form.Item
              name="baseName"
              className={styles.rowItem}
              rules={[
                { required: true, message: t('setup.usernameRequired') },
                { min: 2, max: 20, message: t('setup.usernameLength') }
              ]}
            >
              <div className={styles.row} data-testid="setup-base-name">
                <span className={styles.rowLabel}>{t('setup.username')}</span>
                <Input
                  variant="borderless"
                  className={styles.rowInput}
                  placeholder={t('setup.usernamePlaceholder')}
                  maxLength={20}
                  onPressEnter={submitFormOnEnter(form)}
                />
              </div>
            </Form.Item>
            <div className={styles.divider} role="separator" />
            <div className={styles.row} aria-live="polite">
              <span className={styles.rowLabel}>{t('setup.deviceName')}</span>
              <span className={styles.rowValue}>{deviceName || t('setup.detecting')}</span>
            </div>
            <div className={styles.divider} role="separator" />
            <Form.Item name="department" className={styles.rowItem}>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{t('setup.department')}</span>
                <Input
                  variant="borderless"
                  className={styles.rowInput}
                  placeholder={t('setup.departmentPlaceholder')}
                  maxLength={50}
                  onPressEnter={submitFormOnEnter(form)}
                />
              </div>
            </Form.Item>
          </section>

          <p className={styles.footnote}>{t('setup.footnote')}</p>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            className={styles.submitBtn}
            data-testid="setup-submit"
          >
            {t('setup.continue')}
          </Button>
        </Form>
      </div>
    </div>
  )
}
