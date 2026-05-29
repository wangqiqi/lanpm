import { useEffect, useState } from 'react'
import { Avatar, Checkbox, Form, Input, Modal, Tabs, Typography } from 'antd'
import DataStoragePanel from '@renderer/features/profile/DataStoragePanel'
import { UserOutlined } from '@ant-design/icons'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNetworkStore } from '@renderer/stores/networkStore'
import { useNotificationPrefsStore } from '@renderer/stores/notificationPrefsStore'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { ProfileUpdateInput } from '@shared/identity'
import { LANPM_APP_VERSION } from '@shared/appVersion'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

interface ProfileFormValues {
  baseName: string
  department?: string
}

export default function ProfileModal({ open, onClose }: ProfileModalProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const user = useIdentityStore((s) => s.user)
  const device = useIdentityStore((s) => s.device)
  const localIp = useNetworkStore((s) => s.status?.localIp)
  const refreshNetwork = useNetworkStore((s) => s.refresh)
  const notifyAllMessages = useNotificationPrefsStore((s) => s.notifyAllMessages)
  const setNotifyAllMessages = useNotificationPrefsStore((s) => s.setNotifyAllMessages)
  const hydrateNotificationPrefs = useNotificationPrefsStore((s) => s.hydrate)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const [form] = Form.useForm<ProfileFormValues>()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (!open) return
    void refreshNetwork({ silent: true })
    hydrateNotificationPrefs()
  }, [open, refreshNetwork, hydrateNotificationPrefs])

  useEffect(() => {
    if (!open || !user) return
    form.setFieldsValue({
      baseName: user.baseName,
      department: user.department ?? ''
    })
  }, [open, user, form])

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const input: ProfileUpdateInput = {
        baseName: values.baseName.trim(),
        department: values.department?.trim() || undefined,
        avatarUrl: user?.avatarUrl
      }
      const status = await getLanpmApi().identity.updateProfile(input)
      if (status.user && status.device) {
        setFromStatus(true, status.user, status.device)
      }
      message.success(t('profile.saved'))
      onClose()
    } catch (err) {
      message.error(formatError(err, 'profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const suffixHint =
    user?.suffix && user.displayName !== user.baseName
      ? t('profile.suffixHint', { displayName: user.displayName, suffix: user.suffix })
      : null

  return (
    <Modal
      title={t('profile.title')}
      open={open}
      onCancel={onClose}
      onOk={() => (activeTab === 'profile' ? form.submit() : onClose())}
      okText={activeTab === 'profile' ? undefined : t('common.cancel')}
      confirmLoading={activeTab === 'profile' ? saving : false}
      destroyOnHidden
      width={520}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'profile',
            label: t('profile.tabProfile'),
            children: (
              <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar size={48} icon={<UserOutlined />} src={user?.avatarUrl ?? undefined} />
        <div>
          <Typography.Text type="secondary">{t('profile.userId')}</Typography.Text>
          <div>{user?.userId ?? '—'}</div>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false} onFinish={() => void submit()}>
        <Form.Item
          name="baseName"
          label={t('profile.displayName')}
          rules={[
            { required: true, message: t('setup.usernameRequired') },
            { min: 2, max: 20, message: t('setup.usernameLength') }
          ]}
          extra={suffixHint}
        >
          <Input
            maxLength={20}
            placeholder={t('setup.usernamePlaceholder')}
            onPressEnter={submitFormOnEnter(form)}
          />
        </Form.Item>
        <Form.Item name="department" label={t('profile.department')}>
          <Input
            maxLength={50}
            placeholder={t('setup.departmentPlaceholder')}
            onPressEnter={submitFormOnEnter(form)}
          />
        </Form.Item>
        <Form.Item label={t('profile.notifications')}>
          <Checkbox
            checked={notifyAllMessages}
            onChange={(e) => setNotifyAllMessages(e.target.checked)}
          >
            {t('profile.notifyAllMessages')}
          </Checkbox>
          <div>
            <Typography.Text type="secondary">{t('profile.notifyAllMessagesHint')}</Typography.Text>
          </div>
        </Form.Item>
        <Form.Item label={t('profile.device')}>
          <Typography.Text>{device?.deviceName ?? '—'}</Typography.Text>
          <div>
            <Typography.Text type="secondary">
              {t('profile.ipWithAddress', { ip: localIp ?? '—' })}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">
              {t('profile.versionWithNumber', { version: LANPM_APP_VERSION })}
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
              </>
            )
          },
          {
            key: 'data',
            label: t('profile.tabData'),
            children: <DataStoragePanel />
          }
        ]}
      />
    </Modal>
  )
}
