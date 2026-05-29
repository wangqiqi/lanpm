import { useParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { message } from 'antd'
import type { AppView } from '@shared/navigation/types'
import { formatDmTitle, getDmPeerUserId, isDmGroupId } from '@shared/chat/dmSession'
import ChatView from '@renderer/features/chat/ChatView'
import BoardView from '@renderer/features/board/BoardView'
import TaskTreeView from '@renderer/features/tree/TaskTreeView'
import GanttView from '@renderer/features/gantt/GanttView'
import FilesView from '@renderer/features/files/FilesView'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewHeader from '@renderer/ui/ViewHeader'
import { useI18n } from '@renderer/i18n/useI18n'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import styles from './GroupView.module.css'

/** 聊天页标题为群名/DM 名；任务类视图为模块名（docs/05 §1.1） */
export default function GroupView({ view }: { view: AppView }): React.ReactElement {
  const { t } = useI18n()
  const { groupId } = useParams<{ groupId: string }>()
  const group = useNavigationStore((s) => s.groups.find((g) => g.groupId === groupId))
  const getGroupLabel = useNavigationStore((s) => s.getGroupLabel)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const getPeerDisplayName = useDmStore((s) => s.getPeerDisplayName)
  const touchSession = useDmStore((s) => s.touchSession)
  const localUserId = useIdentityStore((s) => s.user?.userId)

  useEffect(() => {
    if (groupId && isDmGroupId(groupId)) {
      touchSession(groupId)
    }
  }, [groupId, touchSession])

  const anonymousHintShown = useRef<string | null>(null)

  useEffect(() => {
    if (!groupId || isDmGroupId(groupId)) return
    if (getGroupType(groupId) !== 'anonymous') return
    void getLanpmApi().group.enterAnonymous(groupId)
    if (anonymousHintShown.current !== groupId) {
      anonymousHintShown.current = groupId
      message.info(t('group.anonymousHint'))
    }
    return () => {
      void getLanpmApi().group.leaveAnonymous(groupId)
    }
  }, [groupId, getGroupType, t])

  const chatTitle = (() => {
    if (!groupId) return '—'
    if (isDmGroupId(groupId) && localUserId) {
      const peerId = getDmPeerUserId(groupId, localUserId)
      if (peerId) {
        return formatDmTitle(getPeerDisplayName(groupId, peerId))
      }
    }
    return group?.name ?? getGroupLabel(groupId)
  })()

  const pageTitle = view === 'chat' ? chatTitle : t(VIEW_MESSAGE_KEYS[view])
  const isChat = view === 'chat'

  return (
    <div className={`${styles.root} ${isChat ? '' : styles.taskView}`}>
      <ViewHeader title={pageTitle} />
      <div className={isChat ? styles.chatBody : styles.taskBody}>
        {view === 'chat' && <ChatView />}
        {view === 'board' && <BoardView />}
        {view === 'tree' && <TaskTreeView />}
        {view === 'gantt' && <GanttView />}
        {view === 'files' && <FilesView />}
      </div>
    </div>
  )
}
