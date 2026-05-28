import { useCallback, useEffect, useState } from 'react'
import { List, Typography } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { GroupMemberView } from '@shared/chat/members'
import { isDmGroupId } from '@shared/chat/dmSession'
import { presenceEmoji, presenceLabel } from '@shared/presence'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { groupViewPath } from '@renderer/routes/paths'
import styles from './chat.module.css'

const { Text } = Typography

const PRESENCE_POLL_MS = 3_000

interface MemberListProps {
  groupId: string
  onInsertMention: (displayName: string) => void
}

export default function MemberList({
  groupId,
  onInsertMention
}: MemberListProps): React.ReactElement {
  const [members, setMembers] = useState<GroupMemberView[]>([])
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const openSession = useDmStore((s) => s.openSession)
  const navigate = useNavigate()
  const isDm = isDmGroupId(groupId)

  const refreshMembers = useCallback(() => {
    void getLanpmApi()
      .chat.listMembers(groupId)
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [groupId])

  useEffect(() => {
    refreshMembers()
    const timer = window.setInterval(refreshMembers, PRESENCE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshMembers])

  const startDm = (member: GroupMemberView): void => {
    if (!currentUserId || member.userId === currentUserId) return
    const originGroupId = isDm ? useDmStore.getState().lastOriginGroupId : groupId
    const dmGroupId = openSession(member.userId, member.displayName, currentUserId, originGroupId)
    navigate(groupViewPath(dmGroupId, 'chat'))
  }

  const onlineCount = members.filter((m) => m.presence === 'online').length

  return (
    <aside className={styles.memberList}>
      <Text type="secondary" className={styles.memberTitle}>
        {isDm ? '私聊对象' : '成员'}
      </Text>
      <List
        size="small"
        dataSource={members}
        locale={{ emptyText: '暂无成员' }}
        renderItem={(member) => {
          const isSelf = member.userId === currentUserId
          const presence = member.presence ?? 'offline'
          return (
            <List.Item className={styles.memberItem}>
              <div className={styles.memberRow}>
                <button
                  type="button"
                  className={styles.memberBtn}
                  onClick={() => onInsertMention(member.displayName)}
                  title={`@${member.displayName} · ${presenceLabel(presence)}`}
                >
                  <span className={styles.memberDot} aria-hidden>
                    {presenceEmoji(presence)}
                  </span>
                  <span className={styles.memberName}>
                    {member.displayName}
                    {isSelf ? '（我）' : ''}
                  </span>
                </button>
                {!isSelf && !isDm && (
                  <button
                    type="button"
                    className={styles.dmBtn}
                    title="发起私聊"
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
        <Text type="secondary" className={styles.memberStats}>
          在线 {onlineCount}/{members.length}
        </Text>
      )}
    </aside>
  )
}
