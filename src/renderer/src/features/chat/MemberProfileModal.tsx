import { Avatar, Modal, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { GroupMemberView } from '@shared/chat/members'
import { presenceEmoji } from '@shared/presence'
import { useI18n } from '@renderer/i18n/useI18n'
import { presenceMessageKey } from '@renderer/i18n/presence'
import RegionButton from '@renderer/ui/RegionButton'

const { Text } = Typography

interface MemberProfileModalProps {
  member: GroupMemberView | null
  isSelf: boolean
  dmAllowed: boolean
  open: boolean
  onClose: () => void
  onMention: (displayName: string) => void
  onStartDm?: (member: GroupMemberView) => void
}

function avatarLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

export default function MemberProfileModal({
  member,
  isSelf,
  dmAllowed,
  open,
  onClose,
  onMention,
  onStartDm
}: MemberProfileModalProps): React.ReactElement {
  const { t } = useI18n()
  const presence = member?.presence ?? 'offline'

  return (
    <Modal
      title={t('chat.memberProfileTitle')}
      open={open && member != null}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {member ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar size={48} icon={<UserOutlined />}>
              {avatarLabel(member.displayName)}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {member.displayName}
                {isSelf ? t('common.me') : ''}
              </Text>
              <div>
                <Text type="secondary">
                  {presenceEmoji(presence)} {t(presenceMessageKey(presence))}
                </Text>
              </div>
            </div>
          </div>
          <div>
            <Text type="secondary">{t('chat.memberUserId')}</Text>
            <div>
              <Text code copyable={{ text: member.userId }}>
                {member.userId}
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isSelf ? (
              <RegionButton
                variant="toolbar"
                onClick={() => {
                  onMention(member.displayName)
                  onClose()
                }}
              >
                {t('chat.mentionMember', { name: member.displayName })}
              </RegionButton>
            ) : null}
            {!isSelf && dmAllowed && onStartDm ? (
              <RegionButton
                variant="toolbar"
                onClick={() => {
                  onStartDm(member)
                  onClose()
                }}
              >
                {t('chat.startDm')}
              </RegionButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
