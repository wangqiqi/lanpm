import { useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Tabs, Typography } from 'antd'
import DataStoragePanel from '@renderer/features/profile/DataStoragePanel'
import NavPreferencesPanel from '@renderer/features/profile/NavPreferencesPanel'
import LiveKitConfigPanel from '@renderer/features/profile/LiveKitConfigPanel'
import PluginsPanel from '@renderer/features/profile/PluginsPanel'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNetworkStore } from '@renderer/stores/networkStore'
import { useNotificationPrefsStore } from '@renderer/stores/notificationPrefsStore'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { ProfileUpdateInput } from '@shared/identity'
import { LANPM_APP_VERSION } from '@shared/appVersion'
import { submitFormOnEnter } from '@renderer/lib/inputKeyboard'
import UserAvatar from '@renderer/ui/UserAvatar'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  /** Open on a specific tab when modal becomes visible */
  initialTab?: string
}

interface ProfileFormValues {
  baseName: string
  department?: string
}

export default function ProfileModal({
  open,
  onClose,
  initialTab
}: ProfileModalProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const user = useIdentityStore((s) => s.user)
  const device = useIdentityStore((s) => s.device)
  const localIp = useNetworkStore((s) => s.status?.localIp)
  const refreshNetwork = useNetworkStore((s) => s.refresh)
  const notifyAllMessages = useNotificationPrefsStore((s) => s.notifyAllMessages)
  const setNotifyAllMessages = useNotificationPrefsStore((s) => s.setNotifyAllMessages)
  const notifyDueTasks = useNotificationPrefsStore((s) => s.notifyDueTasks)
  const setNotifyDueTasks = useNotificationPrefsStore((s) => s.setNotifyDueTasks)
  const hydrateNotificationPrefs = useNotificationPrefsStore((s) => s.hydrate)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const [form] = Form.useForm<ProfileFormValues>()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab ?? 'profile')
  const isProfileTab = activeTab === 'profile'

  useEffect(() => {
    if (!open) {
      setActiveTab('profile')
      return
    }
    if (initialTab) setActiveTab(initialTab)
    void refreshNetwork({ silent: true })
    hydrateNotificationPrefs()
  }, [open, initialTab, refreshNetwork, hydrateNotificationPrefs])

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
      onOk={isProfileTab ? () => void submit() : undefined}
      okText={isProfileTab ? t('common.save') : undefined}
      confirmLoading={isProfileTab ? saving : false}
      footer={
        isProfileTab
          ? undefined
          : [
              <Button key="close" type="primary" onClick={onClose}>
                {t('common.close')}
              </Button>
            ]
      }
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
                  <UserAvatar
                    size={48}
                    displayName={user?.displayName ?? '—'}
                    userId={user?.userId}
                    avatarUrl={user?.avatarUrl}
                  />
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
                      <Typography.Text type="secondary">
                        {t('profile.notifyAllMessagesHint')}
                      </Typography.Text>
                    </div>
                    <Checkbox
                      style={{ marginTop: 12 }}
                      checked={notifyDueTasks}
                      onChange={(e) => setNotifyDueTasks(e.target.checked)}
                    >
                      {t('profile.notifyDueTasks')}
                    </Checkbox>
                    <div>
                      <Typography.Text type="secondary">
                        {t('profile.notifyDueTasksHint')}
                      </Typography.Text>
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
            key: 'nav',
            label: t('profile.tabNav'),
            children: <NavPreferencesPanel />
          },
          {
            key: 'meeting',
            label: t('profile.tabMeeting'),
            children: <LiveKitConfigPanel />
          },
          {
            key: 'plugins',
            label: t('profile.tabPlugins'),
            children: <PluginsPanel />
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
