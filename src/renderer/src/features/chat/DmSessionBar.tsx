import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { isDmGroupId, getDmPeerUserId } from '@shared/chat/dmSession'
import { useDmStore } from '@renderer/stores/dmStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'
import RegionTabBar, { type RegionTabItem } from '@renderer/ui/RegionTabBar'
import styles from './chat.module.css'

const { Text } = Typography

interface DmSessionBarProps {
  activeGroupId: string
}

export default function DmSessionBar({ activeGroupId }: DmSessionBarProps): React.ReactElement {
  const { t } = useI18n()
  const navigate = useNavigate()
  const sessions = useDmStore((s) => s.sessions)
  const lastOriginGroupId = useDmStore((s) => s.lastOriginGroupId)
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const getPeerDisplayName = useDmStore((s) => s.getPeerDisplayName)

  const inDm = isDmGroupId(activeGroupId)

  const tabItems = useMemo((): RegionTabItem[] => {
    const items: RegionTabItem[] = []
    if (!inDm) {
      items.push({
        key: 'group',
        label: t('chat.groupChat'),
        active: true,
        disabled: true
      })
    } else {
      items.push({
        key: 'back',
        label: t('chat.backToGroup'),
        onClick: () => navigate(groupViewPath(lastOriginGroupId, 'chat'))
      })
    }
    for (const session of sessions) {
      const active = session.groupId === activeGroupId
      items.push({
        key: session.groupId,
        label: t('topbar.dmLabel', { name: session.peerDisplayName }),
        title: session.peerDisplayName,
        active,
        onClick: () => navigate(groupViewPath(session.groupId, 'chat'))
      })
    }
    return items
  }, [inDm, lastOriginGroupId, sessions, activeGroupId, navigate, t])

  return (
    <div className={styles.dmBar}>
      <Text type="secondary" className={styles.memberTitle}>
        {t('chat.dmSessions')}
      </Text>
      <RegionTabBar items={tabItems} ariaLabel={t('chat.dmSessions')} />
      {inDm && localUserId && (
        <Text type="secondary" className={styles.dmHint}>
          {t('chat.dmWith', {
            name: getPeerDisplayName(
              activeGroupId,
              getDmPeerUserId(activeGroupId, localUserId) ?? ''
            )
          })}
        </Text>
      )}
    </div>
  )
}
