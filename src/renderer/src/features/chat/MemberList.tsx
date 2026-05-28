import { useEffect, useState } from 'react'
import { List, Typography } from 'antd'
import type { GroupMemberView } from '@shared/chat/members'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useIdentityStore } from '@renderer/stores/identityStore'
import styles from './chat.module.css'

const { Text } = Typography

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

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .chat.listMembers(groupId)
      .then((list) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  return (
    <aside className={styles.memberList}>
      <Text type="secondary" className={styles.memberTitle}>
        成员
      </Text>
      <List
        size="small"
        dataSource={members}
        locale={{ emptyText: '暂无成员' }}
        renderItem={(member) => (
          <List.Item className={styles.memberItem}>
            <button
              type="button"
              className={styles.memberBtn}
              onClick={() => onInsertMention(member.displayName)}
              title={`@${member.displayName}`}
            >
              <span className={styles.memberDot}>🟢</span>
              <span className={styles.memberName}>
                {member.displayName}
                {member.userId === currentUserId ? '（我）' : ''}
              </span>
            </button>
          </List.Item>
        )}
      />
    </aside>
  )
}
