import { useState } from 'react'
import { Avatar, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { SetupStatus } from '@shared/identity'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { fileToDataUrl, randomAvatarDataUrl } from './avatar'
import styles from './SetupWizard.module.css'

const { Title, Text } = Typography

interface SetupWizardProps {
  onComplete: (status: SetupStatus) => void
}

interface FormValues {
  baseName: string
  deviceName: string
  department?: string
}

export default function SetupWizard({ onComplete }: SetupWizardProps): React.ReactElement {
  const [form] = Form.useForm<FormValues>()
  const [avatarUrl, setAvatarUrl] = useState(() => randomAvatarDataUrl('LP'))
  const [submitting, setSubmitting] = useState(false)

  const baseName = Form.useWatch('baseName', form) ?? ''

  const handleRandomAvatar = (): void => {
    setAvatarUrl(randomAvatarDataUrl(baseName || 'LP'))
  }

  const handleUpload = async (file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return false
    }
    if (file.size > 512 * 1024) {
      message.error('头像图片不超过 512KB')
      return false
    }
    try {
      setAvatarUrl(await fileToDataUrl(file))
    } catch {
      message.error('读取图片失败')
    }
    return false
  }

  const onFinish = async (values: FormValues): Promise<void> => {
    setSubmitting(true)
    try {
      const status = await getLanpmApi().identity.completeSetup({
        baseName: values.baseName.trim(),
        deviceName: values.deviceName.trim(),
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
      <Card className={styles.card} variant="borderless">
        <Title level={3} style={{ marginTop: 0, textAlign: 'center' }}>
          欢迎使用 LanPM
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          完成首次配置后即可使用
        </Text>

        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ deviceName: '' }}
          requiredMark="optional"
        >
          <Form.Item
            label="用户名"
            name="baseName"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 20, message: '用户名为 2–20 个字符' }
            ]}
          >
            <Input placeholder="如：张三" maxLength={20} showCount />
          </Form.Item>

          <Form.Item
            label="设备名称"
            name="deviceName"
            rules={[
              { required: true, message: '请输入设备名称' },
              { max: 30, message: '设备名称不超过 30 个字符' }
            ]}
          >
            <Input placeholder="如：办公本" maxLength={30} showCount />
          </Form.Item>

          <Form.Item label="部门（可选）" name="department">
            <Input placeholder="如：研发部" maxLength={50} />
          </Form.Item>

          <Form.Item label="头像（可选）">
            <div className={styles.avatarRow}>
              <Avatar src={avatarUrl} size={72} className={styles.avatarPreview} />
              <Space direction="vertical" size="small">
                <Button onClick={handleRandomAvatar}>随机生成</Button>
                <Button icon={<UploadOutlined />}>
                  <label style={{ cursor: 'pointer' }}>
                    上传图片
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleUpload(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </Button>
              </Space>
            </div>
            <Text type="secondary" className={styles.hint}>
              若局域网内已有同名用户，将自动添加 -yymm 后缀以保证唯一
            </Text>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              完成
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
