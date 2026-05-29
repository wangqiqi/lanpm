import { Avatar, Descriptions, Modal } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useI18n } from '@renderer/i18n/useI18n'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: ProfileModalProps): React.ReactElement {
  const { t } = useI18n()
  const user = useIdentityStore((s) => s.user)
  const device = useIdentityStore((s) => s.device)

  return (
    <Modal title={t('profile.title')} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t('profile.displayName')}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            src={user?.avatarUrl ?? undefined}
            style={{ marginRight: 8 }}
          />
          {user?.displayName ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('profile.userId')}>{user?.userId ?? '—'}</Descriptions.Item>
        <Descriptions.Item label={t('profile.department')}>
          {user?.department?.trim() ? user.department : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('profile.device')}>
          {device?.deviceName ?? '—'}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  )
}
