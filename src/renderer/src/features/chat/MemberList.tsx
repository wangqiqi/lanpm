import { useEffect } from 'react'
import { List, Typography } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { GroupMemberView } from '@shared/chat/members'
import { isDmGroupId } from '@shared/chat/dmSession'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { presenceEmoji } from '@shared/presence'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath } from '@renderer/routes/paths'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import { useI18n } from '@renderer/i18n/useI18n'
import { presenceMessageKey } from '@renderer/i18n/presence'
import styles from './chat.module.css'

const { Text } = Typography

const PRESENCE_POLL_MS = 3_000

interface MemberListProps {
  groupId: string
  members: GroupMemberView[]
  onRefresh: () => void
  onInsertMention: (displayName: string) => void
}

export default function MemberList({
  groupId,
  members,
  onRefresh,
  onInsertMention
}: MemberListProps): React.ReactElement {
  const { t } = useI18n()
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const openSession = useDmStore((s) => s.openSession)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const navigate = useNavigate()
  const isDm = isDmGroupId(groupId)
  const originGroupId = isDm ? useDmStore.getState().lastOriginGroupId : groupId
  const dmAllowed = groupAllowsDirectMessage(getGroupType(originGroupId))

  useEffect(() => {
    onRefresh()
    const timer = window.setInterval(onRefresh, PRESENCE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [groupId, onRefresh])

  const startDm = (member: GroupMemberView): void => {
    if (!currentUserId || member.userId === currentUserId || !dmAllowed) return
    const dmGroupId = openSession(
      member.userId,
      member.displayName,
      currentUserId,
      originGroupId,
      getGroupType(originGroupId)
    )
    if (!dmGroupId) return
    navigate(groupViewPath(dmGroupId, 'chat'))
  }

  const onlineCount = members.filter((m) => m.presence === 'online').length

  return (
    <aside className={styles.memberList}>
      <Text className={styles.memberTitle}>
        {isDm ? t('chat.dmPeer') : t('chat.members')}
      </Text>
      <List
        size="small"
        dataSource={members}
        locale={{ emptyText: t('chat.noMembers') }}
        renderItem={(member) => {
          const isSelf = member.userId === currentUserId
          const presence = member.presence ?? 'offline'
          const displayLabel = resolveMemberDisplayName(member.displayName, t)
          return (
            <List.Item className={styles.memberItem}>
              <div className={styles.memberRow}>
                <button
                  type="button"
                  className={styles.memberBtn}
                  onClick={() => onInsertMention(member.displayName)}
                  title={`@${displayLabel} · ${t(presenceMessageKey(presence))}`}
                >
                  <span className={styles.memberDot} aria-hidden>
                    {presenceEmoji(presence)}
                  </span>
                  <span className={styles.memberName}>
                    {displayLabel}
                    {isSelf ? t('common.me') : ''}
                  </span>
                </button>
                {!isSelf && !isDm && dmAllowed && (
                  <button
                    type="button"
                    className={styles.dmBtn}
                    title={t('chat.startDm')}
                    onClick={() => startDm(member)}
                  >
                    <MessageOutlined />
                  </button>
                )}
              </div>
            </List.Item>
          )
        }}
      />
      {members.length > 0 && (
        <Text className={styles.memberStats}>
          {t('chat.onlineStats', { online: onlineCount, total: members.length })}
        </Text>
      )}
    </aside>
  )
}
