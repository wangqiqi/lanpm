import { useEffect, useMemo, useState } from 'react'
import { Input, List, Typography } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { GroupMemberView } from '@shared/chat/members'
import { isMachineMember } from '@shared/chat/memberKind'
import { matchesMemberSearch } from '@shared/chat/matchMemberSearch'
import { isDmGroupId } from '@shared/chat/dmSession'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { presenceEmoji } from '@shared/presence'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { chatStoreActions } from '@renderer/features/chat/chatStoreActions'
import { groupViewPath } from '@renderer/routes/paths'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import { useI18n } from '@renderer/i18n/useI18n'
import { presenceMessageKey } from '@renderer/i18n/presence'
import UserAvatar from '@renderer/ui/UserAvatar'
import MachineMemberAvatar from '@renderer/features/chat/MachineMemberAvatar'
import styles from './chat.module.css'

const { Text } = Typography

const PRESENCE_POLL_MS = 12_000

interface MemberListProps {
  groupId: string
  members: GroupMemberView[]
  onRefresh: () => void
  onInsertMention: (displayName: string) => void
  /** 侧栏可见时才轮询 presence */
  presencePolling?: boolean
}

export default function MemberList({
  groupId,
  members,
  onRefresh,
  onInsertMention,
  presencePolling = true
}: MemberListProps): React.ReactElement {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const navGroups = useNavigationStore((s) => s.groups)
  const navigate = useNavigate()
  const isDm = isDmGroupId(groupId)
  const originGroupId = isDm ? useDmStore.getState().lastOriginGroupId : groupId
  const originGroupType = useMemo(() => {
    if (!originGroupId || isDmGroupId(originGroupId)) return 'anonymous' as const
    return navGroups.find((x) => x.groupId === originGroupId)?.type ?? 'project'
  }, [originGroupId, navGroups])
  const dmAllowed = groupAllowsDirectMessage(originGroupType)

  const filteredMembers = useMemo(
    () => members.filter((m) => matchesMemberSearch(m, search)),
    [members, search]
  )

  useEffect(() => {
    if (!presencePolling) return
    onRefresh()
    const tick = (): void => {
      if (document.visibilityState === 'hidden') return
      onRefresh()
    }
    const timer = window.setInterval(tick, PRESENCE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [groupId, onRefresh, presencePolling])

  useEffect(() => {
    setSearch('')
  }, [groupId])

  const startDm = (member: GroupMemberView): void => {
    if (!currentUserId || member.userId === currentUserId || !dmAllowed) return
    const dmGroupId = chatStoreActions.openDmSession(
      member.userId,
      member.displayName,
      currentUserId,
      originGroupId,
      chatStoreActions.getGroupType(originGroupId)
    )
    if (!dmGroupId) return
    navigate(groupViewPath(dmGroupId, 'chat'))
  }

  return (
    <aside className={styles.memberList}>
      <Text className={styles.memberTitle}>
        {isDm ? t('chat.dmPeer') : t('chat.members')}
      </Text>
      {!isDm ? (
        <Input.Search
          allowClear
          size="small"
          className={styles.memberSearch}
          placeholder={t('chat.memberSearchPlaceholder')}
          aria-label={t('chat.memberSearch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      ) : null}
      <List
        size="small"
        dataSource={filteredMembers}
        locale={{
          emptyText: search.trim() ? t('chat.memberSearchEmpty') : t('chat.noMembers')
        }}
        renderItem={(member) => {
          const isSelf = member.userId === currentUserId
          const isMachine = isMachineMember(member)
          const presence = member.presence ?? 'offline'
          const displayLabel = resolveMemberDisplayName(member.displayName, t)
          const online = presence === 'online'
          const rowClass = [
            styles.memberRow,
            isMachine && !online ? styles.memberRowMachineOffline : ''
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <List.Item className={styles.memberItem}>
              <div className={rowClass}>
                <button
                  type="button"
                  className={styles.memberBtn}
                  onClick={() => onInsertMention(member.displayName)}
                  title={
                    isMachine
                      ? `@${displayLabel} · ${t('chat.memberMachine')} · ${t(presenceMessageKey(presence))}`
                      : `@${displayLabel} · ${t(presenceMessageKey(presence))}`
                  }
                >
                  <span className={styles.memberAvatarWrap} aria-hidden>
                    {isMachine ? (
                      <MachineMemberAvatar size={24} online={online} />
                    ) : (
                      <UserAvatar
                        size={24}
                        displayName={displayLabel}
                        userId={member.userId}
                        avatarUrl={member.avatarUrl}
                      />
                    )}
                    <span className={styles.memberPresenceBadge}>{presenceEmoji(presence)}</span>
                  </span>
                  <span className={styles.memberName}>
                    {isMachine ? (
                      <span className={styles.memberMachineBadge}>{t('chat.memberMachine')}</span>
                    ) : null}
                    {displayLabel}
                    {isSelf ? t('common.me') : ''}
                  </span>
                </button>
                {!isSelf && !isDm && dmAllowed && !isMachine && (
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
    </aside>
  )
}
