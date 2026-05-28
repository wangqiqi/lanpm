import { useEffect, useState } from 'react'
import { Avatar, Button, Form, Input, Upload, message, type UploadProps } from 'antd'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { SetupStatus } from '@shared/identity'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { fileToDataUrl, randomAvatarDataUrl } from './avatar'
import styles from './SetupWizard.module.css'

interface SetupWizardProps {
  onComplete: (status: SetupStatus) => void
}

interface FormValues {
  baseName: string
  department?: string
}

export default function SetupWizard({ onComplete }: SetupWizardProps): React.ReactElement {
  const [form] = Form.useForm<FormValues>()
  const [avatarUrl, setAvatarUrl] = useState(() => randomAvatarDataUrl('LP'))
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
      message.error('请选择图片文件')
      return Upload.LIST_IGNORE
    }
    if (file.size > 512 * 1024) {
      message.error('头像图片不超过 512KB')
      return Upload.LIST_IGNORE
    }
    try {
      setAvatarUrl(await fileToDataUrl(file))
    } catch {
      message.error('读取图片失败')
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
      message.success('配置已保存')
      onComplete(status)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sheet}>
        <header className={styles.hero}>
          <div className={styles.appIcon} aria-hidden>
            L
          </div>
          <h1 className={styles.title}>欢迎使用 LanPM</h1>
          <p className={styles.subtitle}>设置本机身份，加入局域网协作</p>
        </header>

        <section className={styles.avatarBlock}>
          <Avatar src={avatarUrl} size={88} className={styles.avatar} />
          <div className={styles.avatarLinks}>
            <button type="button" className={styles.linkBtn} onClick={handleRandomAvatar}>
              <ReloadOutlined />
              随机头像
            </button>
            <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
              <button type="button" className={styles.linkBtn}>
                <UploadOutlined />
                上传照片
              </button>
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
          <section className={styles.group} aria-label="基本信息">
            <Form.Item
              name="baseName"
              className={styles.rowItem}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, max: 20, message: '2–20 个字符' }
              ]}
            >
              <div className={styles.row}>
                <span className={styles.rowLabel}>用户名</span>
                <Input
                  variant="borderless"
                  className={styles.rowInput}
                  placeholder="必填"
                  maxLength={20}
                />
              </div>
            </Form.Item>
            <div className={styles.divider} role="separator" />
            <div className={styles.row} aria-live="polite">
              <span className={styles.rowLabel}>设备名称</span>
              <span className={styles.rowValue}>{deviceName || '识别中…'}</span>
            </div>
            <div className={styles.divider} role="separator" />
            <Form.Item name="department" className={styles.rowItem}>
              <div className={styles.row}>
                <span className={styles.rowLabel}>部门</span>
                <Input
                  variant="borderless"
                  className={styles.rowInput}
                  placeholder="选填"
                  maxLength={50}
                />
              </div>
            </Form.Item>
          </section>

          <p className={styles.footnote}>
            设备名称根据本机系统自动识别，用于区分你的多台电脑。若局域网内已有同名用户，将自动添加
            -yymm 后缀以保证唯一。
          </p>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            className={styles.submitBtn}
          >
            继续
          </Button>
        </Form>
      </div>
    </div>
  )
}
