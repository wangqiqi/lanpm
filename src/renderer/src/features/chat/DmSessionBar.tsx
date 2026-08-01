import { memo, useEffect, useMemo } from 'react'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { isDmGroupId } from '@shared/chat/dmSession'
import type { ChatMessage } from '@shared/chat/types'
import { lastChatMessage, messagePreviewText } from '@shared/chat/messagePreview'
import { useDmStore, type DmSession } from '@renderer/stores/dmStore'
import { chatStoreActions } from '@renderer/features/chat/chatStoreActions'
import { useChatStore } from '@renderer/stores/chatStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import type { MessageKey } from '@renderer/i18n/messages'
import type { TranslateParams } from '@renderer/i18n/messages'
import { resolveGroupDisplayName, resolveGroupDisplayNameById } from '@renderer/i18n/groupLabels'
import type { NavGroup } from '@shared/navigation/types'
import { groupViewPath } from '@renderer/routes/paths'
import { formatSessionTime } from '@renderer/features/chat/formatSessionTime'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

const { Text } = Typography

const EMPTY_MESSAGES: ChatMessage[] = []

export type ChatDmPanelLayout = 'main'

interface DmSessionBarProps {
  activeGroupId: string
  layout: ChatDmPanelLayout
}

function originLabel(
  session: DmSession,
  groups: NavGroup[],
  t: (key: MessageKey, params?: TranslateParams) => string
): string {
  const g = groups.find((x) => x.groupId === session.originGroupId)
  const name = g ? resolveGroupDisplayName(g, t) : session.originGroupId
  return t('chat.dmFromProject', { name })
}

interface DmSessionRowProps {
  session: DmSession
  active: boolean
  showOrigin: boolean
  groups: NavGroup[]
  sessionTimeLabels: { today: string; yesterday: string }
  locale: string
  onOpen: (groupId: string) => void
}

const DmSessionRow = memo(function DmSessionRow({
  session,
  active,
  showOrigin,
  groups,
  sessionTimeLabels,
  locale,
  onOpen
}: DmSessionRowProps): React.ReactElement {
  const { t } = useI18n()
  const thread = useChatStore((s) => s.messagesByGroup[session.groupId] ?? EMPTY_MESSAGES)
  const last = lastChatMessage(thread)
  const preview = last ? messagePreviewText(last, t('chat.recalledPreview')) : ''
  const timeLabel = last ? formatSessionTime(last.createdAt, locale, sessionTimeLabels) : ''

  return (
    <button
      type="button"
      className={`${styles.dmSessionItem} ${active ? styles.dmSessionItemActive : ''}`}
      onClick={() => onOpen(session.groupId)}
    >
      <span className={styles.dmSessionRowTop}>
        <span className={styles.dmSessionName}>{session.peerDisplayName}</span>
        {timeLabel ? <span className={styles.dmSessionTime}>{timeLabel}</span> : null}
      </span>
      <span className={styles.dmSessionPreview}>{preview || t('chat.dmNoPreview')}</span>
      {showOrigin && (
        <span className={styles.dmSessionOrigin}>{originLabel(session, groups, t)}</span>
      )}
    </button>
  )
})

export default function DmSessionBar({ activeGroupId, layout }: DmSessionBarProps): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const sessions = useDmStore((s) => s.sessions)
  const lastOriginGroupId = useDmStore((s) => s.lastOriginGroupId)
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const groups = useNavigationStore((s) => s.groups)

  useEffect(() => {
    chatStoreActions.pruneDmDisallowedOrigins()
  }, [groups])

  useEffect(() => {
    if (localUserId) void chatStoreActions.syncDmWithDatabase(localUserId)
  }, [localUserId])

  const inDm = isDmGroupId(activeGroupId)
  const contextProjectId = inDm
    ? (useDmStore.getState().getSession(activeGroupId)?.originGroupId ?? lastOriginGroupId)
    : activeGroupId

  const { projectDms, otherDms } = useMemo(() => {
    const project: DmSession[] = []
    const other: DmSession[] = []
    for (const s of sessions) {
      if (!groupAllowsDirectMessage(chatStoreActions.getGroupType(s.originGroupId))) continue
      if (s.originGroupId === contextProjectId) project.push(s)
      else other.push(s)
    }
    return { projectDms: project, otherDms: other }
  }, [sessions, contextProjectId])

  useEffect(() => {
    if (!isDmGroupId(activeGroupId)) return
    const existing = useChatStore.getState().messagesByGroup[activeGroupId]
    if (!existing || existing.length === 0) {
      void chatStoreActions.loadMessages(activeGroupId)
    }
  }, [activeGroupId])

  const openDm = (groupId: string): void => {
    navigate(groupViewPath(groupId, 'chat'))
  }

  const sessionTimeLabels = useMemo(
    () => ({ today: t('chat.dayToday'), yesterday: t('chat.dayYesterday') }),
    [t]
  )

  const panelClass = layout === 'main' ? styles.dmPanelMain : styles.dmBar

  return (
    <div className={panelClass}>
      <Text className={layout === 'main' ? styles.dmPanelIntro : styles.sidebarSectionTitle}>
        {t('chat.dmPickerHint')}
      </Text>

      <Text className={styles.sidebarSectionTitle}>{t('chat.dmInProject')}</Text>
      <div className={styles.dmSessionList}>
        {projectDms.length === 0 ? (
          <Text type="secondary" className={styles.dmSessionEmpty}>
            {t('chat.noDmInProject')}
          </Text>
        ) : (
          projectDms.map((s) => (
            <DmSessionRow
              key={s.groupId}
              session={s}
              active={s.groupId === activeGroupId}
              showOrigin={false}
              groups={groups}
              sessionTimeLabels={sessionTimeLabels}
              locale={locale}
              onOpen={openDm}
            />
          ))
        )}
      </div>

      {otherDms.length > 0 && (
        <>
          <Text className={styles.sidebarSectionTitle}>{t('chat.dmOtherProjects')}</Text>
          <div className={styles.dmSessionList}>
            {otherDms.map((s) => (
              <DmSessionRow
                key={s.groupId}
                session={s}
                active={s.groupId === activeGroupId}
                showOrigin
                groups={groups}
                sessionTimeLabels={sessionTimeLabels}
                locale={locale}
                onOpen={openDm}
              />
            ))}
          </div>
        </>
      )}

      {layout === 'main' && inDm && localUserId && (
        <Text type="secondary" className={styles.dmPanelFooter}>
          {t('chat.dmFromProject', {
            name: (() => {
              const g = groups.find((gr) => gr.groupId === contextProjectId)
              return g
                ? resolveGroupDisplayName(g, t)
                : resolveGroupDisplayNameById(contextProjectId, contextProjectId, t)
            })()
          })}
        </Text>
      )}
    </div>
  )
}
