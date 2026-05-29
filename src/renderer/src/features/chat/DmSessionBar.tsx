import { useEffect, useMemo } from 'react'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { isDmGroupId } from '@shared/chat/dmSession'
import { lastChatMessage, messagePreviewText } from '@shared/chat/messagePreview'
import { useDmStore, type DmSession } from '@renderer/stores/dmStore'
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

export default function DmSessionBar({ activeGroupId, layout }: DmSessionBarProps): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const sessions = useDmStore((s) => s.sessions)
  const lastOriginGroupId = useDmStore((s) => s.lastOriginGroupId)
  const localUserId = useIdentityStore((s) => s.user?.userId)
  const groups = useNavigationStore((s) => s.groups)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const messagesByGroup = useChatStore((s) => s.messagesByGroup)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const pruneDisallowedOrigins = useDmStore((s) => s.pruneDisallowedOrigins)
  const syncWithDatabase = useDmStore((s) => s.syncWithDatabase)

  useEffect(() => {
    pruneDisallowedOrigins(getGroupType)
  }, [pruneDisallowedOrigins, getGroupType])

  useEffect(() => {
    if (localUserId) void syncWithDatabase(localUserId)
  }, [localUserId, syncWithDatabase])

  const inDm = isDmGroupId(activeGroupId)
  const contextProjectId = inDm
    ? (useDmStore.getState().getSession(activeGroupId)?.originGroupId ?? lastOriginGroupId)
    : activeGroupId

  const { projectDms, otherDms } = useMemo(() => {
    const project: DmSession[] = []
    const other: DmSession[] = []
    for (const s of sessions) {
      if (!groupAllowsDirectMessage(getGroupType(s.originGroupId))) continue
      if (s.originGroupId === contextProjectId) project.push(s)
      else other.push(s)
    }
    return { projectDms: project, otherDms: other }
  }, [sessions, contextProjectId, getGroupType])

  const sessionGroupIds = useMemo(
    () => [...projectDms, ...otherDms].map((s) => s.groupId).join('\0'),
    [projectDms, otherDms]
  )

  useEffect(() => {
    for (const id of sessionGroupIds.split('\0').filter(Boolean)) {
      void loadMessages(id)
    }
  }, [sessionGroupIds, loadMessages])

  const openDm = (groupId: string): void => {
    navigate(groupViewPath(groupId, 'chat'))
  }

  const sessionTimeLabels = useMemo(
    () => ({ today: t('chat.dayToday'), yesterday: t('chat.dayYesterday') }),
    [t]
  )

  const renderDmRow = (session: DmSession, showOrigin: boolean): React.ReactElement => {
    const active = session.groupId === activeGroupId
    const thread = messagesByGroup[session.groupId] ?? []
    const last = lastChatMessage(thread)
    const preview = last ? messagePreviewText(last, t('chat.recalledPreview')) : ''
    const timeLabel = last
      ? formatSessionTime(last.createdAt, locale, sessionTimeLabels)
      : ''

    return (
      <button
        key={session.groupId}
        type="button"
        className={`${styles.dmSessionItem} ${active ? styles.dmSessionItemActive : ''}`}
        onClick={() => openDm(session.groupId)}
      >
        <span className={styles.dmSessionRowTop}>
          <span className={styles.dmSessionName}>{session.peerDisplayName}</span>
          {timeLabel ? <span className={styles.dmSessionTime}>{timeLabel}</span> : null}
        </span>
        <span className={styles.dmSessionPreview}>
          {preview || t('chat.dmNoPreview')}
        </span>
        {showOrigin && (
          <span className={styles.dmSessionOrigin}>{originLabel(session, groups, t)}</span>
        )}
      </button>
    )
  }

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
          projectDms.map((s) => renderDmRow(s, false))
        )}
      </div>

      {otherDms.length > 0 && (
        <>
          <Text className={styles.sidebarSectionTitle}>{t('chat.dmOtherProjects')}</Text>
          <div className={styles.dmSessionList}>
            {otherDms.map((s) => renderDmRow(s, true))}
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
