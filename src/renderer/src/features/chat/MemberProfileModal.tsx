import { Modal, Typography } from 'antd'
import type { GroupMemberView } from '@shared/chat/members'
import { isMachineMember } from '@shared/chat/memberKind'
import { presenceEmoji } from '@shared/presence'
import { useI18n } from '@renderer/i18n/useI18n'
import { presenceMessageKey } from '@renderer/i18n/presence'
import RegionButton from '@renderer/ui/RegionButton'
import UserAvatar from '@renderer/ui/UserAvatar'
import MachineMemberAvatar from '@renderer/features/chat/MachineMemberAvatar'

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
  const isMachine = member != null && isMachineMember(member)
  const online = presence === 'online'

  return (
    <Modal
      title={isMachine ? t('chat.memberMachineProfileTitle') : t('chat.memberProfileTitle')}
      open={open && member != null}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {member ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMachine ? (
              <MachineMemberAvatar size={48} online={online} />
            ) : (
              <UserAvatar
                size={48}
                displayName={member.displayName}
                userId={member.userId}
                avatarUrl={member.avatarUrl}
              />
            )}
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {isMachine ? (
                  <span style={{ marginRight: 6 }}>{t('chat.memberMachine')}</span>
                ) : null}
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
            <Text type="secondary">
              {isMachine ? t('chat.memberDeviceId') : t('chat.memberUserId')}
            </Text>
            <div>
              <Text code copyable={{ text: isMachine ? member.deviceId ?? member.userId : member.userId }}>
                {isMachine ? member.deviceId ?? member.userId : member.userId}
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
            {!isSelf && dmAllowed && onStartDm && !isMachine ? (
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
