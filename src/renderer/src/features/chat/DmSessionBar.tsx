import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { isDmGroupId, formatDmTitle, getDmPeerUserId } from '@shared/chat/dmSession'
import { useDmStore } from '@renderer/stores/dmStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'
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

  return (
    <div className={styles.dmBar}>
      <Text type="secondary" className={styles.memberTitle}>
        {t('chat.dmSessions')}
      </Text>
      <div className={styles.dmList}>
        {!inDm && (
          <button
            type="button"
            className={`${styles.dmChip} ${styles.dmChipMuted}`}
            disabled
          >
            {t('chat.groupChat')}
          </button>
        )}
        {inDm && (
          <button
            type="button"
            className={styles.dmChip}
            onClick={() => navigate(groupViewPath(lastOriginGroupId, 'chat'))}
          >
            {t('chat.backToGroup')}
          </button>
        )}
        {sessions.map((session) => {
          const active = session.groupId === activeGroupId
          const label = formatDmTitle(session.peerDisplayName)
          return (
            <button
              key={session.groupId}
              type="button"
              className={`${styles.dmChip} ${active ? styles.dmChipActive : ''}`}
              onClick={() => navigate(groupViewPath(session.groupId, 'chat'))}
              title={session.groupId}
            >
              {label}
            </button>
          )
        })}
      </div>
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
